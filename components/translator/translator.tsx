"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  Copy,
  History,
  Languages,
  Loader2,
  MessagesSquare,
  Mic,
  MicOff,
  Star,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, LANG_BY_CODE, PHRASES, type Phrase } from "@/lib/data/languages";
import { useActivity, useMounted, useStats } from "@/lib/hooks/store";
import { translate, type TranslationResult } from "@/lib/translate";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge, Card, Chip, Segmented, Select, Textarea } from "../ui/primitives";
import { listen, speak, speechRecognitionSupported } from "./speech";

interface HistoryEntry {
  id: string;
  from: string;
  to: string;
  input: string;
  output: string;
  starred?: boolean;
  at: number;
}

const HISTORY_KEY = "tembea.translations";

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveHistory(h: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function Translator() {
  const [mode, setMode] = useState<"text" | "conversation" | "phrasebook">("text");
  const [from, setFrom] = useState("en");
  const [to, setTo] = useState("sw");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const mounted = useMounted();

  useEffect(() => setHistory(loadHistory()), []);
  const pushHistory = useCallback((e: Omit<HistoryEntry, "id" | "at">) => {
    setHistory((h) => {
      if (h[0] && h[0].input === e.input && h[0].to === e.to) return h;
      const next = [{ ...e, id: Math.random().toString(36).slice(2), at: Date.now() }, ...h];
      saveHistory(next);
      return next;
    });
  }, []);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Multilingual translator</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Speak like a local</h1>
          <p className="mt-2 max-w-xl text-ink-soft">Swahili and 12 world languages, plus starter phrases in Kikuyu, Luo, Maa and Kalenjin. Type, talk, or hand your phone over in conversation mode.</p>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "text", label: <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4" /> Translate</span> },
            { value: "conversation", label: <span className="inline-flex items-center gap-1.5"><MessagesSquare className="h-4 w-4" /> Conversation</span> },
            { value: "phrasebook", label: <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Phrases</span> },
          ]}
        />
      </div>

      <div className="mt-6">
        <LanguageBar from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {mode === "text" && <TextMode from={from} to={to} onDone={pushHistory} />}
          {mode === "conversation" && <ConversationMode from={from} to={to} onDone={pushHistory} />}
          {mode === "phrasebook" && <Phrasebook to={to} />}
        </div>
        <HistoryPanel
          entries={mounted ? history : []}
          onStar={(id) =>
            setHistory((h) => {
              const n = h.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e));
              saveHistory(n);
              return n;
            })
          }
          onClear={() => {
            const kept = history.filter((e) => e.starred);
            saveHistory(kept);
            setHistory(kept);
          }}
          onPick={(e) => {
            setFrom(e.from);
            setTo(e.to);
            setMode("text");
            window.dispatchEvent(new CustomEvent("tembea:load-translation", { detail: e.input }));
          }}
        />
      </div>
    </div>
  );
}

function LanguageBar({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const quick = ["sw", "ki", "luo", "mas", "kln"];
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LangSelect value={from} onChange={setFrom} label="From" />
        <Button
          variant="soft"
          size="icon"
          className="mx-auto shrink-0 sm:mx-0"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label="Swap languages"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <LangSelect value={to} onChange={setTo} label="To" />
      </div>
      <div className="scrollbar-none mt-3 flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs text-ink-muted">Kenyan languages:</span>
        {quick.map((c) => (
          <Chip key={c} active={to === c} onClick={() => setTo(c)} className="h-8 shrink-0 text-xs">
            {LANG_BY_CODE[c].native}
          </Chip>
        ))}
      </div>
    </Card>
  );
}

function LangSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-12 font-display font-semibold">
        <optgroup label="Kenya">
          {LANGUAGES.filter((l) => l.kenyan).map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} — {l.native}
              {l.local ? " (phrasebook)" : ""}
            </option>
          ))}
        </optgroup>
        <optgroup label="World">
          {LANGUAGES.filter((l) => !l.kenyan).map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} — {l.native}
            </option>
          ))}
        </optgroup>
      </Select>
    </label>
  );
}

/* ------------------------------------------------------------------ */

function useTranslation(from: string, to: string, onDone: (e: Omit<HistoryEntry, "id" | "at">) => void) {
  const { bump } = useStats();
  const { log } = useActivity();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const reqId = useRef(0);
  const run = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setResult(null);
        return null;
      }
      const id = ++reqId.current;
      setLoading(true);
      const r = await translate(text, from, to);
      if (id !== reqId.current) return null;
      setResult(r);
      setLoading(false);
      if (r.text) {
        bump("translations");
        onDone({ from, to, input: text.trim(), output: r.text });
        log({ kind: "translate", text: `Translated “${text.trim().slice(0, 40)}” to ${LANG_BY_CODE[to].name}`, href: "/translator" });
      }
      return r;
    },
    [from, to, bump, onDone, log],
  );
  return { run, loading, result, setResult };
}

function TextMode({ from, to, onDone }: { from: string; to: string; onDone: (e: Omit<HistoryEntry, "id" | "at">) => void }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const stopRef = useRef<() => void>();
  const { run, loading, result, setResult } = useTranslation(from, to, onDone);

  // Debounced real-time translation
  useEffect(() => {
    const t = setTimeout(() => run(text), 550);
    return () => clearTimeout(t);
  }, [text, run]);

  useEffect(() => {
    const onLoad = (e: Event) => setText((e as CustomEvent<string>).detail);
    window.addEventListener("tembea:load-translation", onLoad);
    return () => window.removeEventListener("tembea:load-translation", onLoad);
  }, []);

  const mic = () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setMicError(null);
    const lang = LANG_BY_CODE[from];
    if (lang.local) setMicError(`Voice input isn't available for ${lang.name} yet — listening in Swahili instead.`);
    setListening(true);
    stopRef.current = listen(
      lang.speech ?? "en-GB",
      (t) => setText(t),
      (err) => {
        setListening(false);
        if (err === "unsupported") setMicError("Voice input needs Chrome, Edge or Safari.");
        else if (err === "not-allowed") setMicError("Microphone permission was blocked.");
      },
    );
  };

  const target = LANG_BY_CODE[to];
  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-2">
        <div className="border-b border-ink/[0.06] p-4 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between">
            <Badge tone="neutral">
              {LANG_BY_CODE[from].name}
            </Badge>
            {text && (
              <button onClick={() => { setText(""); setResult(null); }} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-sand-100" aria-label="Clear">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={from === "en" ? "Type or speak… e.g. “How much is this?”" : "Type or speak…"}
            className="mt-2 border-0 p-1 font-display text-xl font-medium focus:ring-0 sm:text-2xl"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <Button variant={listening ? "danger" : "soft"} size="md" onClick={mic}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? "Stop" : "Speak"}
            </Button>
            <span className="text-xs text-ink-muted">{text.length}/500</span>
          </div>
          {micError && <p className="mt-2 text-xs text-ochre-600">{micError}</p>}
        </div>

        <div className="bg-savanna-50/40 p-4">
          <div className="flex items-center justify-between">
            <Badge tone="green">
              {target.name}
            </Badge>
            <div className="flex items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-savanna-600" />}
              {result?.source === "phrasebook" && <Badge tone="ochre">Phrasebook</Badge>}
              {result?.source === "machine" && <Badge tone="neutral">Machine translation</Badge>}
            </div>
          </div>
          <div className="mt-3 min-h-[168px]">
            {result?.text ? (
              <p className="font-display text-xl font-semibold text-savanna-700 sm:text-2xl">{result.text}</p>
            ) : (
              <p className="font-display text-xl text-ink-muted/60">{text ? (loading ? "Translating…" : "") : "Translation appears here"}</p>
            )}
            {result?.note && <p className="mt-3 text-sm text-ink-soft">{result.note}</p>}
            {!!result?.suggestions?.length && (
              <ul className="mt-3 space-y-2">
                {result.suggestions.map((p) => (
                  <li key={p.id} className="rounded-xl bg-white p-3 text-sm shadow-card">
                    <span className="text-ink-muted">{p.en}</span> → <span className="font-semibold">{(p as unknown as Record<string, string>)[to]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!result?.text}
              onClick={() => speak(result!.text, target.speech ?? "en-GB")}
              title={target.local ? `Read aloud with a Swahili voice (no ${target.name} voice available)` : "Read aloud"}
            >
              <Volume2 className="h-4 w-4" /> Listen
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!result?.text}
              onClick={async () => {
                await navigator.clipboard.writeText(result!.text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

interface Turn {
  id: string;
  who: "me" | "them";
  original: string;
  translated: string;
}

function ConversationMode({ from, to, onDone }: { from: string; to: string; onDone: (e: Omit<HistoryEntry, "id" | "at">) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [active, setActive] = useState<"me" | "them" | null>(null);
  const [live, setLive] = useState("");
  const [typed, setTyped] = useState<{ me: string; them: string }>({ me: "", them: "" });
  const stopRef = useRef<() => void>();
  const end = useRef<HTMLDivElement>(null);
  const supported = useMemo(() => speechRecognitionSupported(), []);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [turns, live]);

  const handle = useCallback(
    async (who: "me" | "them", text: string) => {
      if (!text.trim()) return;
      const src = who === "me" ? from : to;
      const dst = who === "me" ? to : from;
      const r = await translate(text, src, dst);
      const out = r.text || r.suggestions?.map((p) => (p as unknown as Record<string, string>)[dst]).filter(Boolean)[0] || "—";
      setTurns((t) => [...t, { id: Math.random().toString(36).slice(2), who, original: text, translated: out }]);
      if (r.text) {
        onDone({ from: src, to: dst, input: text, output: r.text });
        speak(r.text, LANG_BY_CODE[dst].speech ?? "en-GB");
      }
    },
    [from, to, onDone],
  );

  const talk = (who: "me" | "them") => {
    if (active) {
      stopRef.current?.();
      return;
    }
    setActive(who);
    setLive("");
    let latest = "";
    stopRef.current = listen(
      LANG_BY_CODE[who === "me" ? from : to].speech ?? "en-GB",
      (t) => {
        latest = t;
        setLive(t);
      },
      () => {
        setActive(null);
        setLive("");
        handle(who, latest);
      },
    );
  };

  const side = (who: "me" | "them") => {
    const lang = LANG_BY_CODE[who === "me" ? from : to];
    return (
      <div className={cn("rounded-3xl p-4", who === "me" ? "bg-savanna-50" : "bg-ochre-50")}>
        <p className="font-display text-sm font-semibold">
          {who === "me" ? "You" : "Them"} · {lang.name}
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handle(who, typed[who]);
            setTyped((t) => ({ ...t, [who]: "" }));
          }}
        >
          <input
            value={typed[who]}
            onChange={(e) => setTyped((t) => ({ ...t, [who]: e.target.value }))}
            placeholder="Type a message…"
            className="h-11 min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-4 text-sm focus:outline-none focus:ring-4 focus:ring-savanna-100"
          />
          <Button
            type="button"
            size="icon"
            variant={active === who ? "danger" : who === "me" ? "primary" : "ochre"}
            className="h-11 w-11"
            onClick={() => talk(who)}
            disabled={!supported || (active !== null && active !== who)}
            aria-label={`Speak as ${who === "me" ? "you" : "them"}`}
          >
            {active === who ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    );
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="max-h-[440px] min-h-[260px] space-y-3 overflow-y-auto rounded-2xl bg-sand-50 p-4">
        {!turns.length && !live && (
          <div className="grid h-[220px] place-items-center text-center text-sm text-ink-muted">
            <div>
              <MessagesSquare className="mx-auto h-8 w-8 text-ink-muted/50" />
              <p className="mt-2">Take turns speaking — each message is translated and read aloud for the other person.</p>
              {!supported && <p className="mt-1 text-ochre-600">Voice needs Chrome, Edge or Safari; typing works everywhere.</p>}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {turns.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", t.who === "me" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-3xl px-4 py-3 shadow-card", t.who === "me" ? "rounded-br-lg bg-savanna-500 text-white" : "rounded-bl-lg bg-white")}>
                <p className="text-lg font-semibold leading-snug">{t.translated}</p>
                <p className={cn("mt-1 text-xs", t.who === "me" ? "text-white/75" : "text-ink-muted")}>{t.original}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {live && <p className={cn("text-sm italic text-ink-muted", active === "me" ? "text-right" : "")}>{live}…</p>}
        <div ref={end} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {side("me")}
        {side("them")}
      </div>
      {turns.length > 0 && (
        <button onClick={() => setTurns([])} className="mt-3 text-xs font-semibold text-ink-muted hover:text-maasai-500">
          Clear conversation
        </button>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function Phrasebook({ to }: { to: string }) {
  const target = LANG_BY_CODE[to];
  const cats = Array.from(new Set(PHRASES.map((p) => p.category)));
  const [cat, setCat] = useState(cats[0]);
  const isPhraseLang = ["sw", "ki", "luo", "mas", "kln"].includes(to);
  const lang = isPhraseLang ? to : "sw";
  const list = PHRASES.filter((p) => p.category === cat);
  return (
    <Card className="p-4 sm:p-5">
      {!isPhraseLang && <p className="mb-3 rounded-2xl bg-ochre-50 p-3 text-sm text-ochre-600">The phrasebook covers Kenyan languages — showing Swahili. Use Translate mode for {target.name}.</p>}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
        {cats.map((c) => (
          <Chip key={c} active={c === cat} onClick={() => setCat(c)} className="shrink-0">
            {c}
          </Chip>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-ink/[0.06]">
        {list.map((p: Phrase) => {
          const t = (p as unknown as Record<string, string | undefined>)[lang];
          return (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">{p.en}</p>
                <p className={cn("font-display text-lg font-semibold", t ? "text-ink" : "text-ink-muted/50")}>{t ?? "Coming soon"}</p>
              </div>
              {t && (
                <Button variant="ghost" size="icon" onClick={() => speak(t, LANG_BY_CODE[lang].speech ?? "sw-KE")} aria-label={`Listen to ${t}`}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-muted">Local-language phrases are a starter set. Pronunciation uses a Swahili voice where no native voice exists.</p>
    </Card>
  );
}

function HistoryPanel({
  entries,
  onStar,
  onClear,
  onPick,
}: {
  entries: HistoryEntry[];
  onStar: (id: string) => void;
  onClear: () => void;
  onPick: (e: HistoryEntry) => void;
}) {
  const sorted = [...entries].sort((a, b) => Number(!!b.starred) - Number(!!a.starred) || b.at - a.at);
  return (
    <Card className="h-fit p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-sm font-semibold">
          <History className="h-4 w-4" /> Recent
        </p>
        {entries.length > 0 && (
          <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-maasai-500">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      {sorted.length ? (
        <ul className="mt-3 space-y-2">
          {sorted.slice(0, 12).map((e) => (
            <li key={e.id} className="group flex items-start gap-2 rounded-2xl p-2 hover:bg-sand-50">
              <button onClick={() => onPick(e)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs text-ink-muted">
                  {LANG_BY_CODE[e.from]?.name} → {LANG_BY_CODE[e.to]?.name}
                </p>
                <p className="truncate text-sm">{e.input}</p>
                <p className="truncate text-sm font-semibold text-savanna-700">{e.output}</p>
              </button>
              <button onClick={() => onStar(e.id)} className="p-1" aria-label={e.starred ? "Unstar" : "Star"}>
                <Star className={cn("h-4 w-4", e.starred ? "fill-ochre-400 text-ochre-400" : "text-ink-muted/40 group-hover:text-ink-muted")} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Your translations will appear here. Star the ones you use most.</p>
      )}
    </Card>
  );
}
