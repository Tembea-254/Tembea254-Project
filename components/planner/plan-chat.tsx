"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PLACE_BY_ID, type Interest, type Tier } from "@/lib/data/places";
import { parsePrompt } from "@/lib/planner/engine";
import type { Group, PlanRequest, TravelStyle } from "@/lib/planner/types";
import { addDays, cn, fmtDate, todayISO } from "@/lib/utils";

/**
 * "Ask me questions" planning: a short conversation that gathers where, how long, who, budget,
 * dates and pace before the itinerary is built. Every question offers tap-to-answer chips,
 * and free text works too (it goes through the same prompt parser as the main box).
 */
type Step = "where" | "days" | "who" | "count" | "budget" | "when" | "pace" | "extra" | "ready";
type Msg = { from: "bot" | "me"; text: string };
type Opt = { label: string; apply: (d: Draft) => Partial<Draft> };
type Draft = PlanRequest & { budgetUnsure?: boolean };

const WHERE: Opt[] = [
  { label: "Safari & wildlife", apply: (d) => ({ interests: add(d.interests, "wildlife") }) },
  { label: "Beach & coast", apply: (d) => ({ interests: add(d.interests, "beach") }) },
  { label: "Safari + beach", apply: (d) => ({ interests: add(add(d.interests, "wildlife"), "beach") }) },
  { label: "Culture & history", apply: (d) => ({ interests: add(d.interests, "culture") }) },
  { label: "Maasai Mara", apply: (d) => ({ places: add(d.places, "maasai-mara") }) },
  { label: "Diani", apply: (d) => ({ places: add(d.places, "diani") }) },
  { label: "Amboseli", apply: (d) => ({ places: add(d.places, "amboseli") }) },
  { label: "Lamu", apply: (d) => ({ places: add(d.places, "lamu") }) },
  { label: "Not sure, surprise me", apply: (d) => ({ interests: d.interests.length ? d.interests : ["wildlife", "beach"] }) },
];
const DAYS: Opt[] = [3, 5, 7, 10, 14].map((n) => ({ label: `${n} days`, apply: () => ({ days: n }) }));
const WHO: Opt[] = [
  { label: "Just me", apply: () => ({ group: "solo" as Group, travelers: 1 }) },
  { label: "Two of us", apply: () => ({ group: "couple" as Group, travelers: 2 }) },
  { label: "Family with kids", apply: () => ({ group: "family" as Group }) },
  { label: "Group of friends", apply: () => ({ group: "friends" as Group }) },
];
const COUNT: Opt[] = [3, 4, 5, 6, 8, 10].map((n) => ({ label: `${n} people`, apply: () => ({ travelers: n }) }));
const BUDGET: Opt[] = [
  { label: "Budget: camps & guesthouses", apply: () => ({ budget: "budget" as Tier }) },
  { label: "Mid-range: comfortable lodges", apply: () => ({ budget: "mid" as Tier }) },
  { label: "Premium: luxury camps", apply: () => ({ budget: "luxury" as Tier }) },
  { label: "Not sure, show me the costs", apply: () => ({ budget: "mid" as Tier, budgetUnsure: true }) },
];
const WHEN: Opt[] = [
  { label: "In 2 weeks", apply: () => ({ startDate: addDays(todayISO(), 14) }) },
  { label: "Next month", apply: () => ({ startDate: addDays(todayISO(), 30) }) },
  { label: "In 3 months", apply: () => ({ startDate: addDays(todayISO(), 90) }) },
  { label: "December holidays", apply: () => ({ startDate: nextDec() }) },
];
const PACE: Opt[] = [
  { label: "Slow and relaxed", apply: () => ({ style: "relaxed" as TravelStyle }) },
  { label: "Balanced", apply: () => ({ style: "balanced" as TravelStyle }) },
  { label: "See as much as possible", apply: () => ({ style: "packed" as TravelStyle }) },
];
const EXTRA: Opt[] = [
  { label: "Hot-air balloon", apply: (d) => ({ prompt: `${d.prompt} hot-air balloon`.trim(), interests: add(d.interests, "adventure") }) },
  { label: "Honeymoon", apply: (d) => ({ prompt: `${d.prompt} honeymoon`.trim(), interests: add(d.interests, "relax") }) },
  { label: "Great food", apply: (d) => ({ interests: add(d.interests, "food") }) },
  { label: "Nightlife", apply: (d) => ({ interests: add(d.interests, "city") }) },
  { label: "No, plan it!", apply: () => ({}) },
];

const QUESTIONS: Record<Exclude<Step, "ready">, { ask: (d: Draft) => string; opts: Opt[]; multi?: boolean }> = {
  where: { ask: () => "Karibu! Where are you dreaming of in Kenya? Pick as many as you like, or just type it.", opts: WHERE, multi: true },
  days: { ask: () => "How many days do you have, including travel days?", opts: DAYS },
  who: { ask: () => "Who's coming along?", opts: WHO },
  count: { ask: (d) => `How many ${d.group === "family" ? "people in the family" : "of you"} in total?`, opts: COUNT },
  budget: { ask: () => "What kind of stays feel right? I'll price everything for you either way.", opts: BUDGET },
  when: { ask: () => "When would you like to start?", opts: WHEN },
  pace: { ask: () => "And the pace?", opts: PACE },
  extra: { ask: () => "Anything special I should fit in? Type it, or tap one.", opts: EXTRA, multi: true },
};

function add<T>(list: T[], v: T) {
  return list.includes(v) ? list : [...list, v];
}
function nextDec() {
  const now = new Date();
  const y = now.getMonth() >= 11 && now.getDate() > 15 ? now.getFullYear() + 1 : now.getFullYear();
  return `${y}-12-20`;
}

function nextStep(step: Step, d: Draft): Step {
  const order: Step[] = ["where", "days", "who", "count", "budget", "when", "pace", "extra", "ready"];
  let i = order.indexOf(step) + 1;
  // skip "how many" for solo travellers and couples
  if (order[i] === "count" && (d.group === "solo" || d.group === "couple")) i++;
  return order[i];
}

export function PlanChat({ base, onPlan, busy }: { base: PlanRequest; onPlan: (r: PlanRequest) => void; busy: boolean }) {
  const [draft, setDraft] = useState<Draft>({ ...base, prompt: "", places: [], interests: [] });
  const [step, setStep] = useState<Step>("where");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: QUESTIONS.where.ask(draft) }]);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // newer browsers return a Promise from scrollIntoView: never hand that back to React as a cleanup
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [msgs]);

  function advance(d: Draft, answer: string) {
    const nxt = nextStep(step, d);
    setDraft(d);
    setPicked([]);
    setMsgs((m) => [...m, { from: "me", text: answer }, { from: "bot", text: nxt === "ready" ? summary(d) : QUESTIONS[nxt].ask(d) }]);
    setStep(nxt);
  }

  /** free text: understand whatever it mentions (places, days, people, budget) and move on */
  function sendText() {
    const t = text.trim();
    if (!t) return;
    setText("");
    const p = parsePrompt(t);
    let d: Draft = { ...draft, prompt: `${draft.prompt} ${t}`.trim(), places: [...new Set([...draft.places, ...p.places])], interests: [...new Set([...draft.interests, ...p.interests])] };
    const touched = new Set(d.touched ?? []);
    if (p.days) (d.days = Math.min(21, Math.max(2, p.days))), touched.add("days");
    if (p.travelers) (d.travelers = p.travelers), touched.add("travelers");
    if (p.group) (d.group = p.group), touched.add("group");
    if (p.budget) (d.budget = p.budget), touched.add("budget");
    const num = Number(t.replace(/[^\d]/g, ""));
    if (step === "days" && !p.days && num >= 2 && num <= 21) (d.days = num), touched.add("days");
    if (step === "count" && !p.travelers && num >= 1 && num <= 20) (d.travelers = num), touched.add("travelers");
    const date = new Date(t);
    if (step === "when" && !Number.isNaN(date.getTime()) && date.getTime() > Date.now()) d.startDate = date.toISOString().slice(0, 10);
    d = { ...d, touched: [...touched] };
    advance(d, t);
  }

  function choose(o: Opt) {
    const q = step !== "ready" ? QUESTIONS[step] : null;
    if (q?.multi && o.label !== "No, plan it!" && o.label !== "Not sure, surprise me") {
      setPicked((p) => (p.includes(o.label) ? p.filter((x) => x !== o.label) : [...p, o.label]));
      return;
    }
    const d = { ...draft, ...o.apply(draft) } as Draft;
    if (["days", "travelers", "group", "budget"].some((k) => k in o.apply(draft))) d.touched = [...new Set([...(d.touched ?? []), ...(Object.keys(o.apply(draft)).filter((k) => ["days", "travelers", "group", "budget"].includes(k)) as ("days" | "budget" | "group" | "travelers")[])])];
    advance(d, o.label);
  }

  function confirmMulti() {
    const q = step !== "ready" ? QUESTIONS[step] : null;
    if (!q) return;
    let d = draft;
    for (const label of picked) {
      const o = q.opts.find((x) => x.label === label);
      if (o) d = { ...d, ...o.apply(d) } as Draft;
    }
    advance(d, picked.join(", "));
  }

  function restart() {
    const d = { ...base, prompt: "", places: [], interests: [] };
    setDraft(d);
    setStep("where");
    setPicked([]);
    setMsgs([{ from: "bot", text: QUESTIONS.where.ask(d) }]);
  }

  const q = step !== "ready" ? QUESTIONS[step] : null;
  return (
    <div className="p-2 pt-3">
      <div className="max-h-[340px] space-y-2 overflow-y-auto rounded-2xl bg-sand-50 p-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
              <p className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm", m.from === "me" ? "rounded-br-md bg-savanna-500 text-white" : "rounded-bl-md bg-white text-ink shadow-card")}>
                {m.from === "bot" && i === msgs.length - 1 && step === "ready" && <Sparkles className="mr-1 inline h-3.5 w-3.5 text-savanna-600" />}
                {m.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {q && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.opts.map((o) => (
            <button
              key={o.label}
              onClick={() => choose(o)}
              className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", picked.includes(o.label) ? "border-savanna-500 bg-savanna-50 text-savanna-800" : "border-ink/10 bg-white text-ink-soft hover:border-savanna-400 hover:text-ink")}
            >
              {o.label}
            </button>
          ))}
          {q.multi && picked.length > 0 && (
            <button onClick={confirmMulti} className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 font-display text-sm font-semibold text-white">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {step === "ready" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={restart} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
          <button
            onClick={() => onPlan({ ...draft, prompt: draft.prompt || describe(draft) })}
            disabled={busy}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-savanna-500 px-6 font-display font-semibold text-white shadow-lift disabled:opacity-60"
          >
            Build my itinerary <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendText();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={step === "where" ? "e.g. Mara for the migration, then beach in Watamu" : "Or type your answer…"}
            className="h-11 min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500"
          />
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white" aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}

const INTEREST_WORD: Record<Interest, string> = { wildlife: "safari", beach: "beach", culture: "culture", adventure: "adventure", food: "food", city: "city life", relax: "relaxing" };

function describe(d: Draft) {
  const where = [...d.places.map((p) => PLACE_BY_ID[p]?.name), ...d.interests.map((i) => INTEREST_WORD[i])].filter(Boolean).join(", ");
  return `${d.days} days in Kenya: ${where || "the highlights"}`;
}

function summary(d: Draft) {
  const who = d.group === "solo" ? "just you" : d.group === "couple" ? "the two of you" : `${d.travelers} people (${d.group})`;
  const budget = d.budgetUnsure ? "mid-range for now, with every cost shown so you can adjust" : d.budget === "luxury" ? "premium stays" : d.budget === "budget" ? "budget stays" : "mid-range lodges";
  return `Here's what I have:\n• ${describe(d)}\n• ${who}\n• ${budget}\n• starting ${fmtDate(d.startDate, { day: "numeric", month: "short", year: "numeric" })}, ${d.style} pace\n\nI'll build the day-by-day route, then compare stays and safari companies for you with prices.`;
}
