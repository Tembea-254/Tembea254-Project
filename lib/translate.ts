import { LANG_BY_CODE, PHRASES, type Phrase, type PhraseLang } from "./data/languages";

export interface TranslationResult {
  text: string;
  source: "phrasebook" | "machine" | "none";
  confidence?: number;
  suggestions?: Phrase[];
  note?: string;
  /** which engine answered, e.g. "google", "nllb", "google+nllb" */
  engine?: string;
  /** early model: do not rely on it for safety-critical text */
  experimental?: boolean;
  /** how long the translation took, in milliseconds */
  ms?: number;
}

export interface TranslateOptions {
  /** ignore the phrasebook and force a live translation (used by "Try live translation instead") */
  skipPhrasebook?: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function phraseText(p: Phrase, lang: string) {
  return (p as unknown as Record<string, string | undefined>)[lang];
}

/** Find a phrase whose text in `lang` (any of its "/"-separated variants) matches the input. */
export function findPhrase(input: string, lang: string): Phrase | undefined {
  const n = norm(input.replace(/…/g, ""));
  if (!n) return;
  return PHRASES.find((p) => {
    const t = phraseText(p, lang);
    if (!t) return false;
    return t.split("/").some((v) => norm(v.replace(/…/g, "")) === n);
  });
}

export function similarPhrases(input: string, lang: string, target: string, limit = 4): Phrase[] {
  const words = new Set(norm(input).split(" ").filter((w) => w.length > 2));
  if (!words.size) return [];
  return PHRASES.filter((p) => phraseText(p, target))
    .map((p) => {
      const t = norm(phraseText(p, lang) ?? p.en);
      const score = [...words].filter((w) => t.includes(w)).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

async function machine(text: string, from: string, to: string): Promise<TranslationResult> {
  const f = LANG_BY_CODE[from]?.mt;
  const t = LANG_BY_CODE[to]?.mt;
  if (!f || !t) return { text: "", source: "none" };
  // MyMemory: free, CORS-enabled translation memory + MT. Swap for Google/DeepL/NLLB in production.
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${f}|${t}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MT ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string; match?: number }; responseStatus?: number };
  const out = data.responseData?.translatedText ?? "";
  if (!out || data.responseStatus !== 200 || /MYMEMORY WARNING/i.test(out)) throw new Error("MT quota or error");
  return { text: decode(out), source: "machine", engine: "mymemory", confidence: data.responseData?.match };
}

function decode(s: string) {
  if (typeof document === "undefined") return s;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

type ApiOutcome = { ok: true; result: TranslationResult } | { ok: false; problem: string };

/** Ask Tembea's own API (Google Cloud / NLLB with failover). Says why when it cannot answer. */
async function viaApi(text: string, from: string, to: string): Promise<ApiOutcome> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 14000);
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      const problem =
        res.status === 401 ? "please sign in again" :
        res.status === 429 ? "too many requests, wait a few seconds" :
        res.status === 503 ? "the engine is busy or offline" :
        d.error ?? `error ${res.status}`;
      return { ok: false, problem };
    }
    const d = (await res.json()) as { text?: string; engine?: string; experimental?: boolean };
    if (!d.text) return { ok: false, problem: "empty answer" };
    return {
      ok: true,
      result: {
        text: d.text,
        source: "machine",
        engine: d.engine,
        experimental: d.experimental,
        note: d.experimental ? "Early-stage model for a Kenyan language. Check anything important with a local, and use the Phrases tab for emergencies." : undefined,
      },
    };
  } catch {
    return { ok: false, problem: "no answer in time" };
  } finally {
    clearTimeout(timer);
  }
}

export async function translate(text: string, from: string, to: string, opts: TranslateOptions = {}): Promise<TranslationResult> {
  const t0 = Date.now();
  const r = await translateInner(text, from, to, opts);
  return { ...r, ms: Date.now() - t0 };
}

async function translateInner(text: string, from: string, to: string, opts: TranslateOptions): Promise<TranslationResult> {
  const input = text.trim();
  if (!input) return { text: "", source: "none" };
  if (from === to) return { text: input, source: "phrasebook" };

  const fromLocal = LANG_BY_CODE[from]?.local;
  const toLocal = LANG_BY_CODE[to]?.local;
  const engineLocal = LANG_BY_CODE[from]?.api === "nllb" || LANG_BY_CODE[to]?.api === "nllb";
  // a local language with neither a phrasebook match nor an engine (Kikuyu, Maa, Kalenjin) cannot be machine translated
  const unsupportedLocal = (fromLocal && LANG_BY_CODE[from]?.api !== "nllb") || (toLocal && LANG_BY_CODE[to]?.api !== "nllb");

  // 1. Phrasebook first (verified phrases, works offline). Skipped when the user asks for a live translation.
  if (!opts.skipPhrasebook) {
    const hit = findPhrase(input, from);
    if (hit) {
      const direct = phraseText(hit, to);
      if (direct) return { text: direct, source: "phrasebook", engine: "phrasebook", confidence: 1 };
      // the phrasebook has the phrase but not in the target language: translate its English text live
      if (!(toLocal && LANG_BY_CODE[to]?.api !== "nllb")) {
        const o = await viaApi(hit.en, "en", to);
        if (o.ok) return { ...o.result, note: o.result.note ?? "Translated via the English phrase" };
      }
    }
  }

  // 2. Tembea translation API: Google Cloud / our NLLB engine, with server-side failover.
  let apiProblem: string | undefined;
  if (!unsupportedLocal) {
    const o = await viaApi(input, from, to);
    if (o.ok) return o.result;
    apiProblem = o.problem;
  }

  // 3. Public MT fallback in the browser for pairs without a local-language leg.
  if (!fromLocal && !toLocal) {
    try {
      const m = await machine(input, from, to);
      return apiProblem ? { ...m, note: `Tembea's engine is unavailable (${apiProblem}), so this came from a public fallback and may be less accurate.` } : m;
    } catch {
      return { text: "", source: "none", note: `Couldn't reach a translation service${apiProblem ? ` (${apiProblem})` : ""}. Check your connection and try again.` };
    }
  }

  // 3. Local language without a phrasebook match: pivot what we can, and suggest phrases.
  if (toLocal && !fromLocal) {
    let english = input;
    if (from !== "en") {
      try {
        english = (await machine(input, from, "en")).text;
      } catch {
        /* keep input */
      }
    }
    const viaEn = findPhrase(english, "en");
    const t = viaEn && phraseText(viaEn, to);
    if (t) return { text: t, source: "phrasebook", confidence: 0.85, note: `Matched “${viaEn!.en}”` };
  }
  const name = LANG_BY_CODE[toLocal ? to : from]?.name;
  return {
    text: "",
    source: "none",
    suggestions: similarPhrases(input, from, to),
    note: engineLocal
      ? `The ${name} translation engine didn't answer${apiProblem ? ` (${apiProblem})` : ""} — try again in a moment, use one of these phrases, or switch to Swahili, which most Kenyans speak.`
      : `Full ${name} machine translation isn't available yet — try one of these phrases, or switch to Swahili, which most Kenyans speak.`,
  };
}

export type { PhraseLang };
