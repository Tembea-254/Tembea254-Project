import { LANG_BY_CODE, PHRASES, type Phrase, type PhraseLang } from "./data/languages";

export interface TranslationResult {
  text: string;
  source: "phrasebook" | "machine" | "none";
  confidence?: number;
  suggestions?: Phrase[];
  note?: string;
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
  return { text: decode(out), source: "machine", confidence: data.responseData?.match };
}

function decode(s: string) {
  if (typeof document === "undefined") return s;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

export async function translate(text: string, from: string, to: string): Promise<TranslationResult> {
  const input = text.trim();
  if (!input) return { text: "", source: "none" };
  if (from === to) return { text: input, source: "phrasebook" };

  // 1. Phrasebook first (works offline, covers local languages).
  const hit = findPhrase(input, from);
  if (hit) {
    const direct = phraseText(hit, to);
    if (direct) return { text: direct, source: "phrasebook", confidence: 1 };
    // pivot through English for languages the phrasebook doesn't hold
    if (LANG_BY_CODE[to]?.mt) {
      try {
        return { ...(await machine(hit.en, "en", to)), note: "Translated via the English phrase" };
      } catch {
        /* fall through */
      }
    }
  }

  const fromLocal = LANG_BY_CODE[from]?.local;
  const toLocal = LANG_BY_CODE[to]?.local;

  // 2. Machine translation for supported pairs.
  if (!fromLocal && !toLocal) {
    try {
      return await machine(input, from, to);
    } catch {
      return { text: "", source: "none", note: "Couldn't reach the translation service. Check your connection and try again." };
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
    note: `Full ${name} machine translation isn't available yet — try one of these phrases, or switch to Swahili, which most Kenyans speak.`,
  };
}

export type { PhraseLang };
