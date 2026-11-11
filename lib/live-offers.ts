import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { PLACE_BY_ID, type Tier } from "./data/places";
import { getDb, schema as s } from "./db";
import { originLabel, type Origin } from "./planner/origin";

/**
 * Live packages and local services, found on operators' own websites by Claude's web search.
 * Results are cached for a day per search so each one is paid for once, and every link carries
 * Tembea254 referral tags and goes through /api/go so the referral is recorded.
 */

export type LiveKind = "package" | "transport" | "guide" | "tour";
export interface LiveOffer {
  provider: string;
  title: string;
  kind: LiveKind;
  placeId?: string;
  /** price exactly as the site shows it, e.g. "USD 1,250 pp" */
  priceText: string;
  /** that price converted to KES per person (or per vehicle/day for transport), when it could be read */
  priceKes?: number;
  per?: "person" | "group" | "vehicle/day" | "day";
  days?: number;
  includes: string[];
  url: string;
  /** /api/go link with referral tags, ready to use */
  go: string;
}
export interface LiveResult {
  status: "live" | "off" | "error";
  offers: LiveOffer[];
  fetchedAt?: string;
  note?: string;
}

const TTL_MS = 24 * 3600_000;
const RATES: Record<string, number> = { KES: 1, KSH: 1, USD: 129, US$: 129, $: 129, EUR: 140, "€": 140, GBP: 165, "£": 165 };
export const REF_PARAMS = { utm_source: "tembea254", utm_medium: "referral", utm_campaign: "ai_planner", ref: "tembea254" };

export const liveEnabled = () => !!process.env.ANTHROPIC_API_KEY;

/** Adds Tembea254's referral tags to an operator's URL. */
export function withRef(url: string) {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(REF_PARAMS)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}

const secret = () => process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "tembea-dev";
/** Signed so /api/go only ever forwards to links Tembea254 itself produced (no open redirect). */
export function signUrl(url: string) {
  return createHmac("sha256", secret()).update(url).digest("hex").slice(0, 20);
}
export function goLink(url: string, meta: { provider: string; placeId?: string; kind: string }) {
  const dest = withRef(url);
  const q = new URLSearchParams({ u: dest, s: signUrl(dest), p: meta.provider.slice(0, 60), k: meta.kind });
  if (meta.placeId) q.set("pl", meta.placeId);
  return `/api/go?${q}`;
}

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

const RULES = `Use web search on real operators' and marketplaces' own websites (for example Bonfire Adventures, SafariBookings, TripAdvisor, GetYourGuide, Viator, Kenyan tour operators and car-hire companies).
Only include an offer if you saw it on a live page: its exact title, the price as written on that page, and that page's URL. Never invent or estimate a price; skip offers without a visible price.
Answer with JSON only: {"offers":[{"provider":string,"title":string,"kind":"package"|"transport"|"guide"|"tour","placeId"?:string,"priceText":string,"amount":number,"currency":"KES"|"USD"|"EUR"|"GBP","per":"person"|"group"|"vehicle/day"|"day","days"?:number,"includes":string[],"url":string}]}`;

function packagesPrompt(a: { places: string[]; days: number; travelers: number; budget: Tier; origin?: Origin }) {
  const names = a.places.map((p) => `${PLACE_BY_ID[p]?.name} (${p})`).join(", ");
  const from = a.origin?.kind === "kenya" ? `Kenyan residents travelling ${originLabel(a.origin)} (prefer resident/citizen rates and packages starting from that city)` : `visitors ${originLabel(a.origin) || "from abroad"} arriving at Nairobi JKIA (non-resident rates)`;
  return `Find 4 to 6 bookable Kenya safari/holiday packages for ${a.travelers} ${from}, about ${a.days} days, ${a.budget === "luxury" ? "premium" : a.budget === "budget" ? "budget" : "mid-range"} level, covering as many of: ${names}. Prefer different providers so they can be compared. Use placeId for the main place covered.\n${RULES}`;
}

function localPrompt(placeId: string) {
  const p = PLACE_BY_ID[placeId];
  return `For travellers visiting ${p?.name ?? placeId}, Kenya, find services they can book in advance with prices: up to 3 vehicle hire or transfer options (kind "transport"), up to 3 tour guide services (kind "guide"), and up to 3 day trips or excursions (kind "tour"). Prefer different companies. Set placeId to "${placeId}".\n${RULES}`;
}

/* ------------------------------------------------------------------ */
/* Claude with web search                                              */
/* ------------------------------------------------------------------ */

async function askClaude(prompt: string): Promise<LiveOffer[]> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const raw = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { offers?: Record<string, unknown>[] };
  return (raw.offers ?? []).flatMap((o) => {
    const url = String(o.url ?? "");
    if (!/^https:\/\/[^/]+\.[^/]+/.test(url) || !o.priceText || !o.title) return [];
    const cur = String(o.currency ?? "KES").toUpperCase();
    const amount = Number(o.amount);
    const kind = (["package", "transport", "guide", "tour"].includes(String(o.kind)) ? o.kind : "package") as LiveKind;
    const provider = String(o.provider ?? new URL(url).hostname.replace(/^www\./, "")).slice(0, 60);
    const placeId = PLACE_BY_ID[String(o.placeId)] ? String(o.placeId) : undefined;
    return [
      {
        provider,
        title: String(o.title).slice(0, 140),
        kind,
        placeId,
        priceText: String(o.priceText).slice(0, 60),
        priceKes: Number.isFinite(amount) && amount > 0 && RATES[cur] ? Math.round(amount * RATES[cur]) : undefined,
        per: (["person", "group", "vehicle/day", "day"].includes(String(o.per)) ? o.per : undefined) as LiveOffer["per"],
        days: Number(o.days) > 0 ? Math.round(Number(o.days)) : undefined,
        includes: Array.isArray(o.includes) ? o.includes.map(String).slice(0, 6) : [],
        url,
        go: goLink(url, { provider, placeId, kind }),
      },
    ];
  });
}

async function cached(key: string, run: () => Promise<LiveOffer[]>): Promise<LiveResult> {
  if (!liveEnabled()) return { status: "off", offers: [], note: "Live prices aren't switched on yet." };
  const db = await getDb();
  const hit = (await db.select().from(s.liveCache).where(eq(s.liveCache.key, key)))[0];
  if (hit && Date.now() - hit.fetchedAt.getTime() < TTL_MS) return { status: "live", offers: hit.data as LiveOffer[], fetchedAt: hit.fetchedAt.toISOString() };
  try {
    const offers = await run();
    const now = new Date();
    await db.insert(s.liveCache).values({ key, data: offers, fetchedAt: now }).onConflictDoUpdate({ target: s.liveCache.key, set: { data: offers, fetchedAt: now } });
    return { status: "live", offers, fetchedAt: now.toISOString() };
  } catch (e) {
    console.error("[live]", e);
    // an older result is better than nothing
    if (hit) return { status: "live", offers: hit.data as LiveOffer[], fetchedAt: hit.fetchedAt.toISOString(), note: "Showing the last saved prices." };
    return { status: "error", offers: [], note: "Live prices couldn't be loaded right now." };
  }
}

export function livePackages(a: { places: string[]; days: number; travelers: number; budget: Tier; origin?: Origin }) {
  const places = [...new Set(a.places)].filter((p) => PLACE_BY_ID[p]).sort();
  const who = a.origin?.kind === "kenya" ? `ke-${a.origin.city ?? "nairobi"}` : "abroad";
  const key = `pk:${places.join(",")}:${Math.min(14, a.days)}:${a.budget}:${who}`;
  return cached(key, () => askClaude(packagesPrompt({ ...a, places })));
}

export function liveLocal(placeId: string) {
  if (!PLACE_BY_ID[placeId]) return Promise.resolve<LiveResult>({ status: "error", offers: [] });
  return cached(`lc:${placeId}`, () => askClaude(localPrompt(placeId)));
}

/* ------------------------------------------------------------------ */
/* Always-available fallbacks: real search pages on the big platforms   */
/* ------------------------------------------------------------------ */

const SAFARIBOOKINGS: Record<string, string> = { "maasai-mara": "masai-mara", amboseli: "amboseli", "tsavo-east": "tsavo-east", "lake-nakuru": "lake-nakuru", samburu: "samburu", "mount-kenya": "mount-kenya", naivasha: "lake-naivasha" };

export interface SearchLink {
  provider: string;
  label: string;
  kind: LiveKind | "stay";
  go: string;
}

/** Where to compare live prices yourself, per place and kind of service. */
export function searchLinks(placeId: string): SearchLink[] {
  const p = PLACE_BY_ID[placeId];
  const name = p?.name ?? placeId;
  const q = encodeURIComponent(`${name} Kenya`);
  const links: { provider: string; label: string; kind: SearchLink["kind"]; url: string }[] = [];
  if (SAFARIBOOKINGS[placeId]) links.push({ provider: "SafariBookings", label: `${name} safari tours`, kind: "package", url: `https://www.safaribookings.com/tours/${SAFARIBOOKINGS[placeId]}` });
  links.push(
    { provider: "Bonfire Adventures", label: `${name} packages`, kind: "package", url: `https://www.bonfireadventures.com/?s=${encodeURIComponent(name)}` },
    { provider: "TripAdvisor", label: `Tours in ${name}`, kind: "tour", url: `https://www.tripadvisor.com/Search?q=${q}%20tours` },
    { provider: "GetYourGuide", label: `Day trips from ${name}`, kind: "tour", url: `https://www.getyourguide.com/s/?q=${q}` },
    { provider: "Viator", label: `Excursions in ${name}`, kind: "tour", url: `https://www.viator.com/searchResults/all?text=${q}` },
    { provider: "Google Maps", label: `Car hire near ${name}`, kind: "transport", url: `https://www.google.com/maps/search/${encodeURIComponent(`car hire ${name} Kenya`)}` },
    { provider: "Google Maps", label: `Tour guides in ${name}`, kind: "guide", url: `https://www.google.com/maps/search/${encodeURIComponent(`tour guide ${name} Kenya`)}` },
  );
  return links.map((l) => ({ provider: l.provider, label: l.label, kind: l.kind, go: goLink(l.url, { provider: l.provider, placeId, kind: l.kind }) }));
}
