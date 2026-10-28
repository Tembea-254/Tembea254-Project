"use client";

/* Web Speech API helpers (Chrome/Edge/Safari). Fail gracefully everywhere else. */

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export function speechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listen(lang: string, onText: (text: string, final: boolean) => void, onEnd: (error?: string) => void) {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd("unsupported");
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  let errored: string | undefined;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    onText(text, final);
  };
  rec.onerror = (e) => (errored = e.error);
  rec.onend = () => onEnd(errored);
  rec.start();
  return () => rec.stop();
}

export function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
  u.lang = lang;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
  return true;
}
