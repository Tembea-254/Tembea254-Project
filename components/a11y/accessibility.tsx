"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Accessibility,
  AArrowDown,
  AArrowUp,
  Contrast,
  Ear,
  Link2,
  Mic,
  MicOff,
  MousePointer2,
  Pause,
  RotateCcw,
  Search,
  Type,
  WrapText,
  X,
  ZoomIn,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { findControl, parseCommand, type VoiceAction } from "./voice-commands";
import { useLoginGate } from "../auth/auth-provider";

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

interface A11y {
  scale: number; // 100..160 (% of base font size) — for long-sighted users
  contrast: boolean; // high contrast
  readable: boolean; // dyslexia-friendly spacing & font
  links: boolean; // underline + outline every link/button
  spacing: boolean; // extra line height
  motion: boolean; // reduce motion
  cursor: boolean; // large cursor
  magnifier: boolean; // hover-to-zoom text — for short-sighted users
  readOnClick: boolean; // click any text to hear it
}
const DEFAULTS: A11y = { scale: 100, contrast: false, readable: false, links: false, spacing: false, motion: false, cursor: false, magnifier: false, readOnClick: false };
const KEY = "tembea.a11y";

function load(): A11y {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<A11y>) };
  } catch {
    return DEFAULTS;
  }
}

function apply(s: A11y) {
  const h = document.documentElement;
  h.style.fontSize = s.scale === 100 ? "" : `${s.scale}%`;
  h.classList.toggle("a11y-contrast", s.contrast);
  h.classList.toggle("a11y-readable", s.readable);
  h.classList.toggle("a11y-links", s.links);
  h.classList.toggle("a11y-spacing", s.spacing);
  h.classList.toggle("a11y-motion", s.motion);
  h.classList.toggle("a11y-cursor", s.cursor);
}

/* ------------------------------------------------------------------ */
/* Speech helpers                                                      */
/* ------------------------------------------------------------------ */

function say(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function readableText(root: Element) {
  const parts: string[] = [];
  root.querySelectorAll("h1, h2, h3, p, li, button, a, label").forEach((el) => {
    const t = (el as HTMLElement).innerText?.trim();
    if (t && t.length > 2 && !parts.includes(t) && (el as HTMLElement).offsetParent !== null) parts.push(t);
  });
  return parts.join(". ").slice(0, 6000);
}

type SRAlt = { transcript: string; confidence: number };
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: { results: ArrayLike<ArrayLike<SRAlt> & { isFinal: boolean; length: number }>; resultIndex: number }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/** Sets an input's value the way React notices it. */
function fillInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function flash(el: HTMLElement) {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  const prev = el.style.outline;
  el.style.outline = "4px solid #F2B13A";
  el.style.outlineOffset = "3px";
  setTimeout(() => {
    el.style.outline = prev;
    el.style.outlineOffset = "";
  }, 1200);
}

export const VOICE_EXAMPLES: [string, string][] = [
  ["Go to planner", "Open any page: home, dashboard, planner, VR, translator, marketplace, community, blog, profile"],
  ["Scroll down / up", "Add “a little” or “a lot”. Also “top” and “bottom”"],
  ["Click Hire", "Press any button or link by its name"],
  ["Type 5 days in Diani", "Writes into the selected box, then say “submit”"],
  ["Read page", "Reads the page aloud. Say “stop” to stop"],
  ["Bigger text", "Also “smaller text”, “high contrast”, “contrast off”"],
  ["Go back", "Also “forward”, “reload”, “close”"],
  ["Stop listening", "Turns voice navigation off"],
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AccessibilityHelper({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { openLogin } = useLoginGate();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<A11y>(DEFAULTS);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [lens, setLens] = useState<{ text: string; x: number; y: number } | null>(null);
  const recRef = useRef<SR | null>(null);
  const wantListen = useRef(false);

  useEffect(() => {
    const v = load();
    setS(v);
    apply(v);
  }, []);

  const update = useCallback((patch: Partial<A11y>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // the ⋯ menu on phones opens the panel with an event
  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("tembea:open-a11y", open);
    return () => window.removeEventListener("tembea:open-a11y", open);
  }, []);

  // Alt + A toggles the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hover magnifier (short-sighted) and click-to-read
  useEffect(() => {
    if (!s.magnifier && !s.readOnClick) {
      setLens(null);
      return;
    }
    const pick = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.("h1,h2,h3,h4,p,li,a,button,label,span,dd,dt,td") as HTMLElement | null;
      if (!el || el.closest("[data-a11y-panel]")) return null;
      const text = el.innerText?.trim();
      return text && text.length < 400 ? { el, text } : null;
    };
    const onMove = (e: MouseEvent) => {
      if (!s.magnifier) return;
      const p = pick(e.target);
      setLens(p ? { text: p.text, x: e.clientX, y: e.clientY } : null);
    };
    const onClick = (e: MouseEvent) => {
      if (!s.readOnClick) return;
      const p = pick(e.target);
      if (p) say(p.text);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick, true);
    };
  }, [s.magnifier, s.readOnClick]);

  /* ---------- voice navigation ---------- */
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const speakingUntil = useRef(0);

  /** Speak a short reply. While Tembea talks, the mic ignores what it hears so it never obeys itself. */
  const talk = useCallback((text: string) => {
    setReply(text);
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 1;
    speakingUntil.current = Date.now() + 60_000;
    u.onend = u.onerror = () => {
      speakingUntil.current = Date.now() + 700;
    };
    window.speechSynthesis.speak(u);
  }, []);

  const run = useCallback(
    (a: VoiceAction) => {
      const smooth: ScrollBehavior = s.motion ? "auto" : "smooth";
      switch (a.kind) {
        case "help":
          setShowHelp(true);
          return talk("Here's what you can say. For example: go to planner, scroll down, click hire, or read page.");
        case "stop-listening":
          wantListen.current = false;
          recRef.current?.abort();
          return talk("Voice navigation off.");
        case "stop-reading":
          window.speechSynthesis?.cancel();
          speakingUntil.current = Date.now() + 300;
          return setReply("Stopped reading");
        case "read": {
          const text = a.what === "heading" ? document.querySelector("main h1, h1")?.textContent?.trim() || "No heading found." : readableText(document.querySelector("main") || document.body);
          setReply(a.what === "heading" ? "Reading the heading" : "Reading the page — say “stop” to stop");
          window.speechSynthesis?.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "en-GB";
          u.rate = 0.95;
          // while reading, only "stop" is listened for (see onresult)
          speakingUntil.current = Date.now() + 10 * 60_000;
          u.onend = u.onerror = () => {
            speakingUntil.current = Date.now() + 700;
          };
          window.speechSynthesis?.speak(u);
          return;
        }
        case "scroll": {
          const h = window.innerHeight;
          const dy = (a.amount === "small" ? h * 0.35 : a.amount === "big" ? h * 1.6 : h * 0.8) * (a.dir === "down" ? 1 : -1);
          window.scrollBy({ top: dy, behavior: smooth });
          return setReply(a.dir === "down" ? "Scrolling down" : "Scrolling up");
        }
        case "edge":
          window.scrollTo({ top: a.to === "top" ? 0 : document.documentElement.scrollHeight, behavior: smooth });
          return setReply(a.to === "top" ? "Top of the page" : "Bottom of the page");
        case "text-size": {
          const scale = a.dir === "reset" ? 100 : Math.min(160, Math.max(100, s.scale + (a.dir === "up" ? 15 : -15)));
          update({ scale });
          return talk(`Text size ${scale} percent`);
        }
        case "contrast": {
          const on = a.on ?? !s.contrast;
          update({ contrast: on });
          return talk(on ? "High contrast on" : "High contrast off");
        }
        case "history":
          if (a.dir === "back") router.back();
          else if (a.dir === "forward") window.history.forward();
          else window.location.reload();
          return setReply(a.dir === "back" ? "Going back" : a.dir === "forward" ? "Going forward" : "Reloading");
        case "navigate":
          if (pathname === a.path) return talk(`You're already on ${a.name}`);
          router.push(a.path);
          return talk(`Opening ${a.name}`);
        case "login":
          openLogin();
          return talk("Opening sign in");
        case "close":
          for (const t of [document, window] as EventTarget[]) t.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          setOpen(false);
          return setReply("Closed");
        case "type": {
          const active = document.activeElement as HTMLElement | null;
          const field =
            active && /^(INPUT|TEXTAREA)$/.test(active.tagName)
              ? (active as HTMLInputElement)
              : ([...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("main textarea, main input[type=text], main input[type=search], main input:not([type])")].find((el) => el.offsetParent !== null) ?? null);
          if (!field) return talk("There's no text box on this page.");
          field.focus();
          fillInput(field, a.text);
          flash(field);
          return talk(`Typed: ${a.text}. Say submit to send.`);
        }
        case "submit": {
          const active = document.activeElement as HTMLElement | null;
          const form = active?.closest("form");
          if (form) {
            form.requestSubmit();
            return setReply("Submitted");
          }
          if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) {
            active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            const btn = findControl("plan") || findControl("send") || findControl("submit");
            if (btn) btn.click();
            return setReply("Submitted");
          }
          return talk("Select a text box first, or say click and the button name.");
        }
        case "click": {
          const el = findControl(a.target);
          if (!el) return talk(`I couldn't find ${a.target} on this page.`);
          flash(el);
          el.focus({ preventScroll: true });
          el.click();
          return talk(`Clicked ${a.target}`);
        }
        default:
          return talk("Sorry, I didn't get that. Say help for examples.");
      }
    },
    [router, pathname, s, update, openLogin, talk],
  );

  const runRef = useRef(run);
  runRef.current = run;

  const startVoice = useCallback(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) {
      setReply("Voice navigation needs Chrome, Edge or Safari.");
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    const nav = navigator.language || "en-US";
    rec.lang = /^en/i.test(nav) ? nav : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const top = r[0]?.transcript ?? "";
        const busyTalking = Date.now() < speakingUntil.current;
        if (!r.isFinal) {
          if (!busyTalking) setInterim(top);
          continue;
        }
        setInterim("");
        // pick the first alternative that is a real command
        const alts = Array.from({ length: r.length }, (_, k) => r[k].transcript);
        let action: VoiceAction = parseCommand(top);
        for (const t of alts) {
          const a = parseCommand(t);
          if (a.kind !== "unknown") {
            action = a;
            break;
          }
        }
        if (busyTalking) {
          // while Tembea is speaking, only obey "stop"
          if (action.kind === "stop-reading" || action.kind === "stop-listening") {
            setHeard(top);
            runRef.current(action);
          }
          continue;
        }
        setHeard(top);
        runRef.current(action);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantListen.current = false;
        setReply("Microphone is blocked. Allow it in the address bar, then try again.");
      } else if (e.error === "audio-capture") {
        wantListen.current = false;
        setReply("No microphone found.");
      }
    };
    rec.onend = () => {
      if (wantListen.current) {
        setTimeout(() => {
          if (!wantListen.current) return;
          try {
            rec.start();
          } catch {
            /* already running */
          }
        }, 250);
        return;
      }
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    wantListen.current = true;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
    setListening(true);
    setOpen(false);
    talk("Listening. Tell me where to go.");
  }, [talk]);

  const stopVoice = useCallback(() => {
    wantListen.current = false;
    recRef.current?.abort();
    setListening(false);
    setInterim("");
    setShowHelp(false);
    setReply("Voice navigation off");
  }, []);

  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  // Alt + V starts / stops voice navigation from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (wantListen.current) stopVoice();
        else startVoice();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startVoice, stopVoice]);

  useEffect(() => () => {
    wantListen.current = false;
    recRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!reply || listening) return;
    const t = setTimeout(() => setReply(null), 3500);
    return () => clearTimeout(t);
  }, [reply, listening]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const toggles: { key: keyof A11y; label: string; hint: string; icon: typeof Contrast }[] = [
    { key: "contrast", label: "High contrast", hint: "Stronger colours for low vision", icon: Contrast },
    { key: "magnifier", label: "Text magnifier", hint: "Hover text to enlarge it", icon: ZoomIn },
    { key: "readOnClick", label: "Click to hear", hint: "Read any text aloud on click", icon: Ear },
    { key: "readable", label: "Readable font", hint: "Wider letter & word spacing", icon: Type },
    { key: "spacing", label: "Line spacing", hint: "More space between lines", icon: WrapText },
    { key: "links", label: "Highlight links", hint: "Outline every link & button", icon: Link2 },
    { key: "cursor", label: "Large cursor", hint: "Easier to track the pointer", icon: MousePointer2 },
    { key: "motion", label: "Reduce motion", hint: "Stop animations", icon: Pause },
  ];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "tm-fab grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-lift ring-4 sm:h-14 sm:w-14 ring-white/70 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-savanna-300",
          listening && "bg-maasai-500",
          className,
        )}
        aria-label="Accessibility and voice navigation (Alt + A)"
        aria-expanded={open}
        title="Accessibility (Alt + A)"
      >
        {listening ? <Mic className="h-6 w-6 animate-pulse" /> : <Accessibility className="h-6 w-6" />}
      </button>

      {/* Voice bar — stays on screen while listening so you always see what was heard and what happened */}
      <AnimatePresence>
        {(listening || reply) && (
          <motion.div
            data-a11y-panel
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[96] mx-auto max-w-lg rounded-3xl bg-ink p-3 text-white shadow-lift sm:bottom-6"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <span className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-full", listening ? "bg-maasai-500" : "bg-white/10")}>
                {listening && <span className="absolute inset-0 animate-ping rounded-full bg-maasai-500/50" />}
                <Mic className="relative h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{interim ? `“${interim}…”` : heard ? `“${heard}”` : listening ? "Listening — say “help” for examples" : ""}</p>
                {reply && <p className="truncate text-xs text-white/70">{reply}</p>}
              </div>
              {listening && (
                <button onClick={() => setShowHelp((h) => !h)} className="hidden h-10 shrink-0 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20 sm:block" aria-expanded={showHelp}>
                  Examples
                </button>
              )}
              {listening ? (
                <button onClick={stopVoice} className="h-10 shrink-0 rounded-full bg-white px-4 font-display text-sm font-semibold text-ink" aria-label="Stop voice navigation">
                  Stop
                </button>
              ) : (
                <button onClick={() => setReply(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {listening && showHelp && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 max-h-[45dvh] space-y-1.5 overflow-y-auto border-t border-white/10 pt-3 text-xs">
                  {VOICE_EXAMPLES.map(([say_, what]) => (
                    <li key={say_}>
                      <span className="font-semibold text-savanna-300">“{say_}”</span> <span className="text-white/65">— {what}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {lens && (
        <div className="pointer-events-none fixed z-[96] max-w-md rounded-2xl border-2 border-ink bg-white p-4 font-sans text-2xl font-medium leading-snug text-ink shadow-lift" style={{ left: Math.min(lens.x + 18, window.innerWidth - 470), top: Math.min(lens.y + 18, window.innerHeight - 160) }}>
          {lens.text}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            data-a11y-panel
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed bottom-24 right-4 z-[95] max-h-[78dvh] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-3xl bg-white p-5 text-ink shadow-lift ring-1 ring-ink/10 sm:right-6"
            role="dialog"
            aria-label="Accessibility settings"
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Accessibility className="h-5 w-5 text-savanna-600" /> Accessibility
              </p>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close accessibility settings">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Voice navigation */}
            <button
              onClick={toggleVoice}
              className={cn(
                "mt-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors",
                listening ? "bg-maasai-500 text-white" : "bg-savanna-500 text-white hover:bg-savanna-600",
              )}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20">{listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</span>
              <span>
                <span className="block font-display font-semibold">{listening ? "Stop voice navigation" : "Start voice navigation"}</span>
                <span className="block text-xs text-white/85">One tap, then just talk: “go to planner”, “scroll down”, “click hire”. Alt + V</span>
              </span>
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => say(readableText(document.querySelector("main") || document.body))} className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 py-3 font-display text-sm font-semibold hover:bg-sand-50">
                <Ear className="h-4 w-4" /> Read page aloud
              </button>
              <button onClick={() => window.speechSynthesis?.cancel()} className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 py-3 font-display text-sm font-semibold hover:bg-sand-50">
                <Pause className="h-4 w-4" /> Stop reading
              </button>
            </div>

            {/* Text size */}
            <div className="mt-5">
              <p className="font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">Text size · {s.scale}%</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => update({ scale: Math.max(100, s.scale - 10) })} className="grid h-11 w-11 place-items-center rounded-xl border border-ink/10 hover:bg-sand-50" aria-label="Smaller text">
                  <AArrowDown className="h-5 w-5" />
                </button>
                <input
                  type="range"
                  min={100}
                  max={160}
                  step={10}
                  value={s.scale}
                  onChange={(e) => update({ scale: Number(e.target.value) })}
                  className="flex-1 accent-savanna-500"
                  aria-label="Text size"
                />
                <button onClick={() => update({ scale: Math.min(160, s.scale + 10) })} className="grid h-11 w-11 place-items-center rounded-xl border border-ink/10 hover:bg-sand-50" aria-label="Larger text">
                  <AArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {toggles.map((t) => (
                <button
                  key={t.key}
                  onClick={() => update({ [t.key]: !s[t.key] } as Partial<A11y>)}
                  aria-pressed={!!s[t.key]}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors",
                    s[t.key] ? "border-savanna-500 bg-savanna-50" : "border-ink/10 hover:bg-sand-50",
                  )}
                >
                  <t.icon className={cn("h-5 w-5", s[t.key] ? "text-savanna-600" : "text-ink-soft")} />
                  <span className="font-display text-sm font-semibold">{t.label}</span>
                  <span className="text-[11px] leading-tight text-ink-muted">{t.hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => update(DEFAULTS)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
                <RotateCcw className="h-4 w-4" /> Reset all
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                <Search className="h-3.5 w-3.5" /> Alt + A to open anytime
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
