import "server-only";
import { LANG_BY_CODE } from "./data/languages";
import { HttpError } from "./session";

/**
 * Server-side translation engines for the Tembea translator.
 *
 *   general pairs (e.g. German <-> English, Swahili <-> French):  Google Cloud Translation  ->  NLLB service
 *   pairs with Dholuo or Taita:                                   English pivot, local leg on the NLLB service
 *
 * Every engine sits behind a circuit breaker: after 3 failures in a row it is skipped for 30 s, so a dead
 * engine never makes the translator hang. The browser then falls back to the phrasebook / MyMemory.
 * Nothing here needs a manual restart: breakers close themselves once the engine answers again.
 */

export interface ServerResult {
  text: string;
  /** engines used, e.g. "google", "nllb" or "google+nllb" */
  engine: string;
  /** the English pivot text, when one was used */
  pivot?: string;
  experimental: boolean;
}

const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const NLLB_URL = process.env.NLLB_SERVICE_URL?.replace(/\/+$/, "");
const NLLB_KEY = process.env.NLLB_SERVICE_KEY;
const NLLB_TIMEOUT = Number(process.env.NLLB_TIMEOUT_MS) || 8000;
const GOOGLE_TIMEOUT = 5000;

/* ----------------------------- circuit breaker ----------------------------- */

type Engine = "google" | "nllb";
const breaker: Record<Engine, { fails: number; openUntil: number }> = {
  google: { fails: 0, openUntil: 0 },
  nllb: { fails: 0, openUntil: 0 },
};
const FAILS_TO_OPEN = 3;
const OPEN_MS = 30_000;

const available = (e: Engine) => Date.now() >= breaker[e].openUntil;
const succeeded = (e: Engine) => (breaker[e] = { fails: 0, openUntil: 0 });
function failed(e: Engine) {
  const b = breaker[e];
  b.fails += 1;
  if (b.fails >= FAILS_TO_OPEN) b.openUntil = Date.now() + OPEN_MS;
}

async function timedFetch(url: string, init: RequestInit, ms: number) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------- engines --------------------------------- */

const decodeEntities = (s: string) =>
  s.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const gCode = (c: string) => LANG_BY_CODE[c]?.google ?? LANG_BY_CODE[c]?.mt ?? c;
const googleCan = (c: string) => !!LANG_BY_CODE[c]?.mt;

async function google(text: string, from: string, to: string): Promise<string> {
  if (!GOOGLE_KEY) throw new Error("google not configured");
  const res = await timedFetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GOOGLE_KEY)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, source: gCode(from), target: gCode(to), format: "text" }) },
    GOOGLE_TIMEOUT,
  );
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  const out = data.data?.translations?.[0]?.translatedText;
  if (!out) throw new Error("google empty");
  return decodeEntities(out);
}

async function nllb(text: string, from: string, to: string): Promise<string> {
  if (!NLLB_URL) throw new Error("nllb not configured");
  const res = await timedFetch(
    `${NLLB_URL}/translate`,
    { method: "POST", headers: { "Content-Type": "application/json", ...(NLLB_KEY ? { "x-api-key": NLLB_KEY } : {}) }, body: JSON.stringify({ text, from, to }) },
    NLLB_TIMEOUT,
  );
  // a 4xx is about this request (e.g. a language the model doesn't know), not a sign the engine is down
  if (res.status === 400 || res.status === 422) throw new HttpError(422, "This language pair isn't supported by the translation engine yet.");
  if (!res.ok) throw new Error(`nllb ${res.status}`);
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("nllb empty");
  return data.text;
}

/** Run one engine through its breaker. */
async function run(e: Engine, fn: () => Promise<string>): Promise<string> {
  if (!available(e)) throw new Error(`${e} paused`);
  try {
    const out = await fn();
    succeeded(e);
    return out;
  } catch (err) {
    if (!(err instanceof HttpError)) failed(e);
    throw err;
  }
}

/** Best engine for a pair with no local-language leg: Google first, our NLLB service as backup. */
async function general(text: string, from: string, to: string): Promise<{ text: string; engine: Engine }> {
  if (GOOGLE_KEY && googleCan(from) && googleCan(to)) {
    try {
      return { text: await run("google", () => google(text, from, to)), engine: "google" };
    } catch {
      /* fall through to NLLB */
    }
  }
  return { text: await run("nllb", () => nllb(text, from, to)), engine: "nllb" };
}

/* --------------------------------- pipeline -------------------------------- */

const cache = new Map<string, { at: number; value: ServerResult }>();
const CACHE_MS = 10 * 60_000;
const CACHE_MAX = 500;

export async function translateServer(text: string, from: string, to: string): Promise<ServerResult> {
  const f = LANG_BY_CODE[from];
  const t = LANG_BY_CODE[to];
  if (!f || !t) throw new HttpError(400, "Unsupported language.");

  const key = `${from}|${to}|${text.trim().toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  // Kikuyu, Maa and Kalenjin have no machine-translation model yet: they are served by the phrasebook in the browser
  const noEngine = [f, t].find((l) => l.local && !l.api);
  if (noEngine) throw new HttpError(422, `${noEngine.name} isn't machine-translated yet — try the phrasebook phrases instead.`);

  const experimental = !!(f.experimental || t.experimental);
  const fromLocal = f.api === "nllb";
  const toLocal = t.api === "nllb";
  let result: ServerResult;

  try {
    if (!fromLocal && !toLocal) {
      const r = await general(text, from, to);
      result = { text: r.text, engine: r.engine, experimental };
    } else if (fromLocal && toLocal) {
      // e.g. Dholuo -> Taita: the service pivots through English itself
      result = { text: await run("nllb", () => nllb(text, from, to)), engine: "nllb", experimental };
    } else if (toLocal) {
      // visitor language -> English (best engine) -> local language (our engine)
      let english = text;
      const used: string[] = [];
      if (from !== "en") {
        const r = await general(text, from, "en");
        english = r.text;
        used.push(r.engine);
      }
      const out = await run("nllb", () => nllb(english, "en", to));
      used.push("nllb");
      result = { text: out, engine: used.join("+"), pivot: from !== "en" ? english : undefined, experimental };
    } else {
      // local language -> English (our engine) -> visitor language (best engine)
      const english = await run("nllb", () => nllb(text, from, "en"));
      const used = ["nllb"];
      let out = english;
      if (to !== "en") {
        const r = await general(english, "en", to);
        out = r.text;
        used.push(r.engine);
      }
      result = { text: out, engine: used.join("+"), pivot: english, experimental };
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.error("[translate]", (e as Error).message);
    throw new HttpError(503, "The translation engine is busy or offline. Please try again in a moment.");
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value: result });
  return result;
}

/* ---------------------------------- status --------------------------------- */

let pingCache: { at: number; ready: boolean } | null = null;

async function nllbReady(): Promise<boolean> {
  if (!NLLB_URL) return false;
  if (pingCache && Date.now() - pingCache.at < 15_000) return pingCache.ready;
  let ready = false;
  try {
    const res = await timedFetch(`${NLLB_URL}/ready`, {}, 2500);
    ready = res.ok;
  } catch {
    ready = false;
  }
  pingCache = { at: Date.now(), ready };
  return ready;
}

export async function engineStatus() {
  return {
    google: !GOOGLE_KEY ? "not configured" : available("google") ? "up" : "paused after errors",
    nllb: !NLLB_URL ? "not configured" : !available("nllb") ? "paused after errors" : (await nllbReady()) ? "up" : "offline or starting",
  };
}

/* -------------------------------- rate limit ------------------------------- */

const hits = new Map<string, number[]>();

/** Simple per-user limit (per server instance). Use a shared store such as Redis for a hard global limit. */
export function rateLimit(key: string, max = 60, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new HttpError(429, "Too many translations — please wait a few seconds.");
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 2000) hits.clear();
}
