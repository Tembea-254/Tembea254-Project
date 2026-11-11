import { createHash } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { CatalogItem, CatalogKind } from "./catalog-types";
import { PLACE_BY_ID } from "./data/places";
import { STAYS, bookingComUrl } from "./data/stays";
import { getDb, schema as s } from "./db";
import { goLink, type LiveOffer } from "./live-offers";
import { activeOffers } from "./repo/partners";

/**
 * The planner's catalogue: every source merged into CatalogItem, for one trip's stops.
 * Affiliate platforms are called only when their keys are set, and cached for 12 hours.
 */

/** hire-marketplace hubs → planner places */
const HUB_PLACE: Record<string, string> = { mara: "maasai-mara", diani: "diani", tsavo: "tsavo-east", nairobi: "nairobi" };
const HIRE_KIND: Record<string, CatalogKind> = { "Drivers & vehicles": "transport", "Tour & local guides": "guide", Photographers: "guide" };
const HIRE_UNIT: Record<string, string> = { "per day": "day", "per half day": "half day", "per session": "session", "per event": "event", "per transfer": "transfer", "per hour": "hour" };
const PARTNER_KIND: Record<string, CatalogKind> = { operator: "package", stay: "stay", transport: "transport" };
const USD = 129;
const EUR = 140;

export async function catalogFor(places: string[], opts: { affiliates?: boolean } = {}): Promise<CatalogItem[]> {
  const want = [...new Set(places)].filter((p) => PLACE_BY_ID[p]);
  const [partners, hires, web, affiliates] = await Promise.all([partnerItems(want), hireItems(want), webItems(want), opts.affiliates === false ? [] : affiliateItems(want)]);
  return [...partners, ...hires, ...stayItems(want), ...web, ...affiliates];
}

async function partnerItems(places: string[]): Promise<CatalogItem[]> {
  const offers = await activeOffers();
  return offers
    .filter((o) => o.places.some((p) => places.includes(p)))
    .map((o) => ({
      id: `partner:${o.id}`,
      source: "partner" as const,
      kind: PARTNER_KIND[o.kind] ?? "package",
      title: o.title,
      provider: o.partner.name,
      places: o.places,
      price: o.pricePerPerson,
      unit: o.unit,
      days: o.days,
      durationText: o.kind === "operator" ? `${o.days} day${o.days > 1 ? "s" : ""}` : undefined,
      tier: o.tier,
      includes: o.includes,
      excludes: o.excludes,
      rating: o.rating ?? undefined,
      reviews: o.reviews,
      sponsored: o.partner.sponsored,
      demo: o.partner.demo,
      book: { mode: "request" as const, offerId: o.id, external: o.url ? goLink(o.url, { provider: o.partner.name, placeId: o.places[0], kind: "partner" }) : undefined },
    }));
}

async function hireItems(places: string[]): Promise<CatalogItem[]> {
  const hubs = Object.entries(HUB_PLACE)
    .filter(([, p]) => places.includes(p))
    .map(([h]) => h);
  if (!hubs.length) return [];
  const db = await getDb();
  const rows = await db.select().from(s.providers).where(and(inArray(s.providers.hub, hubs), eq(s.providers.status, "active")));
  return rows
    .filter((p) => HIRE_KIND[p.category])
    .map((p) => ({
      id: `hire:${p.id}`,
      source: "tembea" as const,
      kind: HIRE_KIND[p.category],
      title: p.headline || p.category,
      provider: p.name.replace(" (demo)", ""),
      places: [HUB_PLACE[p.hub]],
      price: p.rate,
      unit: HIRE_UNIT[p.unit] ?? "day",
      includes: [p.offer, ...p.specialties.slice(0, 3)].filter(Boolean),
      excludes: [],
      cancellation: p.terms || undefined,
      image: p.image,
      languages: p.languages,
      demo: p.demo,
      durationText: p.years ? `${p.years} yrs experience` : undefined,
      book: { mode: "hire" as const, providerId: p.id },
    }));
}

function stayItems(places: string[]): CatalogItem[] {
  return STAYS.filter((st) => places.includes(st.placeId)).map((st) => {
    const place = PLACE_BY_ID[st.placeId].name;
    return {
      id: `stay:${st.id}`,
      source: "hotel" as const,
      kind: "stay" as const,
      title: st.name,
      provider: `${st.type} · ${"★".repeat(st.stars)}`,
      places: [st.placeId],
      price: st.perNight,
      unit: "night",
      tier: st.tier,
      includes: [st.board, ...st.features.slice(0, 3)],
      excludes: [],
      cancellation: st.cancellation,
      image: st.image,
      book: { mode: "external" as const, go: goLink(st.website ?? bookingComUrl(st.name, place), { provider: st.name, placeId: st.placeId, kind: "stay" }) },
    };
  });
}

/** offers our AI already found on operators' sites (cached searches only: no new paid search here) */
async function webItems(places: string[]): Promise<CatalogItem[]> {
  const db = await getDb();
  const rows = places.length ? await db.select().from(s.liveCache).where(inArray(s.liveCache.key, places.map((p) => `lc:${p}`))) : [];
  return rows.flatMap((r) =>
    (r.data as LiveOffer[]).map((o, i) => ({
      id: `web:${r.key}:${i}`,
      source: "web" as const,
      kind: (o.kind === "package" ? "package" : o.kind) as CatalogKind,
      title: o.title,
      provider: o.provider,
      places: o.placeId ? [o.placeId] : [],
      price: o.priceKes,
      priceText: o.priceText,
      unit: o.per === "vehicle/day" ? "vehicle/day" : o.per === "group" ? "group" : o.per === "day" ? "day" : "person",
      days: o.days,
      includes: o.includes,
      excludes: [],
      book: { mode: "external" as const, go: o.go },
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Affiliate platforms                                                 */
/* ------------------------------------------------------------------ */

async function cachedJson<T>(key: string, hours: number, run: () => Promise<T>): Promise<T | undefined> {
  const db = await getDb();
  const hit = (await db.select().from(s.liveCache).where(eq(s.liveCache.key, key)))[0];
  if (hit && Date.now() - hit.fetchedAt.getTime() < hours * 3600_000) return hit.data as T;
  try {
    const data = await run();
    const now = new Date();
    await db.insert(s.liveCache).values({ key, data: data as object, fetchedAt: now }).onConflictDoUpdate({ target: s.liveCache.key, set: { data: data as object, fetchedAt: now } });
    return data;
  } catch (e) {
    console.error(`[catalog] ${key}`, e);
    return hit?.data as T | undefined;
  }
}

async function affiliateItems(places: string[]): Promise<CatalogItem[]> {
  const out = await Promise.all(places.flatMap((p) => [getYourGuide(p), viator(p)]));
  return out.flat();
}

/** GetYourGuide Partner API: GET /1/tours?q= with X-ACCESS-TOKEN. Links already carry partner_id. */
async function getYourGuide(placeId: string): Promise<CatalogItem[]> {
  const token = process.env.GETYOURGUIDE_API_TOKEN;
  if (!token) return [];
  const name = PLACE_BY_ID[placeId].name;
  const tours = await cachedJson(`af:gyg:${placeId}`, 12, async () => {
    const u = new URL("https://api.getyourguide.com/1/tours");
    u.searchParams.set("q", `${name} Kenya`);
    u.searchParams.set("cnt_language", "en");
    u.searchParams.set("currency", "usd");
    u.searchParams.set("limit", "8");
    const res = await fetch(u, { headers: { "X-ACCESS-TOKEN": token, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`GetYourGuide ${res.status}`);
    return ((await res.json()) as { data?: { tours?: Record<string, unknown>[] } }).data?.tours ?? [];
  });
  return (tours ?? []).flatMap((t) => {
    const url = String(t.url ?? "");
    if (!url.startsWith("https://")) return [];
    const price = Number((t.price as { values?: { amount?: number } })?.values?.amount);
    const d = (t.durations as { duration: number; unit: string }[] | undefined)?.[0];
    const pic = (t.pictures as { ssl_url?: string }[] | undefined)?.[0]?.ssl_url?.replace("[format_id]", "21");
    const pid = process.env.GETYOURGUIDE_PARTNER_ID;
    const link = pid && !url.includes("partner_id=") ? `${url}${url.includes("?") ? "&" : "?"}partner_id=${encodeURIComponent(pid)}` : url;
    return [
      {
        id: `gyg:${t.tour_id}`,
        source: "getyourguide" as const,
        kind: "tour" as const,
        title: String(t.title ?? "").slice(0, 140),
        provider: "GetYourGuide",
        places: [placeId],
        price: Number.isFinite(price) && price > 0 ? Math.round(price * USD) : undefined,
        priceText: Number.isFinite(price) && price > 0 ? `USD ${price}` : undefined,
        unit: "person",
        durationText: d ? `${d.duration} ${d.unit}${d.duration > 1 ? "s" : ""}` : undefined,
        includes: [String(t.abstract ?? "").slice(0, 160)].filter(Boolean),
        excludes: [],
        rating: Number(t.overall_rating) || undefined,
        reviews: Number(t.number_of_ratings) || undefined,
        image: pic,
        book: { mode: "external" as const, go: goLink(link, { provider: "GetYourGuide", placeId, kind: "affiliate" }) },
      },
    ];
  });
}

/** Viator Partner API v2: POST /partner/search/freetext with exp-api-key. productUrl carries the affiliate ids. */
async function viator(placeId: string): Promise<CatalogItem[]> {
  const key = process.env.VIATOR_API_KEY;
  if (!key) return [];
  const name = PLACE_BY_ID[placeId].name;
  const products = await cachedJson(`af:viator:${placeId}`, 12, async () => {
    const res = await fetch("https://api.viator.com/partner/search/freetext", {
      method: "POST",
      headers: { "exp-api-key": key, Accept: "application/json;version=2.0", "Accept-Language": "en-US", "Content-Type": "application/json" },
      body: JSON.stringify({ searchTerm: `${name} Kenya`, searchTypes: [{ searchType: "PRODUCTS", pagination: { start: 1, count: 8 } }], currency: "USD" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Viator ${res.status}`);
    return ((await res.json()) as { products?: { results?: Record<string, unknown>[] } }).products?.results ?? [];
  });
  return (products ?? []).flatMap((p) => {
    const url = String(p.productUrl ?? "");
    if (!url.startsWith("https://")) return [];
    const price = Number((p.pricing as { summary?: { fromPrice?: number } })?.summary?.fromPrice);
    const rev = p.reviews as { combinedAverageRating?: number; totalReviews?: number } | undefined;
    const mins = Number((p.duration as { fixedDurationInMinutes?: number })?.fixedDurationInMinutes);
    const variants = (p.images as { variants?: { url: string; width: number }[] }[] | undefined)?.[0]?.variants ?? [];
    const img = variants.sort((a, b) => Math.abs(a.width - 480) - Math.abs(b.width - 480))[0]?.url;
    const cur = String((p.pricing as { currency?: string })?.currency ?? "USD").toUpperCase();
    const rate = cur === "EUR" ? EUR : cur === "KES" ? 1 : USD;
    return [
      {
        id: `viator:${String(p.productCode ?? createHash("md5").update(url).digest("hex").slice(0, 10))}`,
        source: "viator" as const,
        kind: (mins >= 60 * 30 ? "package" : "tour") as CatalogKind,
        title: String(p.title ?? "").slice(0, 140),
        provider: "Viator",
        places: [placeId],
        price: Number.isFinite(price) && price > 0 ? Math.round(price * rate) : undefined,
        priceText: Number.isFinite(price) && price > 0 ? `${cur} ${price}` : undefined,
        unit: "person",
        durationText: Number.isFinite(mins) && mins > 0 ? (mins >= 1440 ? `${Math.round(mins / 1440)} days` : `${Math.round(mins / 60)} h`) : undefined,
        includes: [String(p.description ?? "").slice(0, 160)].filter(Boolean),
        excludes: [],
        rating: rev?.combinedAverageRating || undefined,
        reviews: rev?.totalReviews || undefined,
        image: img,
        book: { mode: "external" as const, go: goLink(url, { provider: "Viator", placeId, kind: "affiliate" }) },
      },
    ];
  });
}

export const affiliatesEnabled = () => ({ viator: !!process.env.VIATOR_API_KEY, getyourguide: !!process.env.GETYOURGUIDE_API_TOKEN, booking: !!process.env.NEXT_PUBLIC_BOOKING_AID });
