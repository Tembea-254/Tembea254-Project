"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  Minus,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { INTEREST_LABELS, PLACES, PLACE_BY_ID, type Interest, type Tier } from "@/lib/data/places";
import { useActivity, useMounted, useProfile, useTrips } from "@/lib/hooks/store";
import { generateTrip } from "@/lib/planner/engine";
import type { Group, PlanRequest, TravelStyle, Trip } from "@/lib/planner/types";
import { addDays, cn, fmtDate, money, todayISO, unsplash } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge, Card, Chip, Input, Segmented, Textarea } from "../ui/primitives";
import { PROMPT_IDEAS, SAMPLE_ROUTES } from "./sample-routes";

const DEFAULT_REQ = (): PlanRequest => ({
  prompt: "",
  days: 7,
  startDate: addDays(todayISO(), 30),
  travelers: 2,
  group: "couple",
  style: "balanced",
  budget: "mid",
  interests: [],
  places: [],
});

const STEPS = ["Reading your trip description", "Mapping the best route across Kenya", "Matching stays to your budget", "Balancing game drives, beaches and rest", "Adding costs, packing list and tips"];

export function PlannerHome() {
  const router = useRouter();
  const params = useSearchParams();
  const { trips, saveTrip, deleteTrip } = useTrips();
  const { log } = useActivity();
  const [profile] = useProfile();
  const mounted = useMounted();

  const [tab, setTab] = useState<"plan" | "explore">("plan");
  const [req, setReq] = useState<PlanRequest>(DEFAULT_REQ);
  const [showOptions, setShowOptions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // From the landing page: /planner?prompt=… → fill in and start planning straight away
  const autoRan = useRef(false);
  useEffect(() => {
    const q = params.get("prompt");
    if (!q || autoRan.current) return;
    autoRan.current = true;
    setReq((r) => ({ ...r, prompt: q }));
    plan({ prompt: q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Deep link from VR: /planner?place=maasai-mara
  useEffect(() => {
    const place = params.get("place");
    if (place && PLACE_BY_ID[place]) {
      setReq((r) => ({ ...r, places: Array.from(new Set([...r.places, place])), prompt: r.prompt || `A trip that includes ${PLACE_BY_ID[place].name}` }));
      setShowOptions(true);
    }
  }, [params]);

  const set = <K extends keyof PlanRequest>(k: K, v: PlanRequest[K]) =>
    setReq((r) => ({
      ...r,
      [k]: v,
      touched: ["days", "budget", "group", "travelers"].includes(k as string) ? Array.from(new Set([...(r.touched ?? []), k as "days"])) : r.touched,
    }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function plan(override?: Partial<PlanRequest>) {
    const body = { ...req, ...override };
    if (!body.prompt.trim() && !body.places.length && !body.interests.length) {
      setError("Tell us a little about your trip — or pick a place or interest below.");
      return;
    }
    setError(null);
    setGenerating(true);
    setStep(0);
    const ticker = window.setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 650);
    const minDelay = new Promise((r) => setTimeout(r, STEPS.length * 650));
    let trip: Trip;
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      trip = ((await res.json()) as { trip: Trip }).trip;
    } catch {
      // Offline or API down: the same engine runs in the browser.
      trip = generateTrip(body);
    }
    await minDelay;
    window.clearInterval(ticker);
    saveTrip(trip);
    log({ kind: "trip", text: `Planned “${trip.title}”`, href: `/planner/${trip.id}` });
    router.push(`/planner/${trip.id}`);
  }

  const sortedTrips = useMemo(() => [...trips].sort((a, b) => b.updatedAt - a.updatedAt), [trips]);

  return (
    <div className="relative">
      {/* Hero — Stippl's "Where to next? Let's plan it." */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_85%_-10%,#CFF5E0_0%,transparent_60%),radial-gradient(800px_400px_at_-10%_10%,#FDE7BD_0%,transparent_55%)]" />
        <div className="container-page grid gap-10 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Badge tone="violet" className="mb-5">
              <Sparkles className="h-3.5 w-3.5" /> Meet your AI travel planner
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-6xl">
              Where to next?
              <br />
              Let&apos;s <span className="underline-swoosh">plan</span> it.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Describe your dream Kenya trip and Tembea builds the full day-by-day itinerary — route, stays, budget and packing list — all in one place.
            </p>

            {/* Composer */}
            <Card className="mt-8 p-2 shadow-lift">
              <Segmented
                className="w-full sm:w-auto"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "plan", label: <span className="inline-flex items-center gap-1.5"><Wand2 className="h-4 w-4" /> Plan</span> },
                  { value: "explore", label: <span className="inline-flex items-center gap-1.5"><Compass className="h-4 w-4" /> Explore</span> },
                ]}
              />
              {tab === "plan" ? (
                <div className="p-2 pt-3">
                  <Textarea
                    rows={3}
                    value={req.prompt}
                    onChange={(e) => set("prompt", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) plan();
                    }}
                    placeholder="Plan me a 10-day safari in the Maasai Mara and a few lazy days in Diani…"
                    className="border-0 bg-sand-50 text-base focus:ring-0"
                  />
                  <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
                    {PROMPT_IDEAS.map((p) => (
                      <button key={p} onClick={() => set("prompt", p)} className="shrink-0 rounded-full border border-ink/10 px-3 py-1.5 text-xs text-ink-soft hover:border-savanna-400 hover:text-ink">
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button onClick={() => setShowOptions((s) => !s)} className="inline-flex items-center gap-2 font-display text-sm font-semibold text-ink-soft hover:text-ink">
                      <SlidersHorizontal className="h-4 w-4" />
                      {showOptions ? "Hide" : "Dates, group & budget"}
                      <span className="text-xs font-normal text-ink-muted">
                        {req.days} days · {req.travelers} {req.travelers === 1 ? "traveller" : "travellers"} · {req.budget}
                      </span>
                    </button>
                    <Button size="lg" onClick={() => plan()} disabled={generating}>
                      Plan with AI <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                  {error && <p className="mt-3 text-sm text-maasai-600">{error}</p>}
                  <AnimatePresence initial={false}>
                    {showOptions && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <Options req={req} set={set} toggle={toggle} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="grid gap-3 p-2 pt-3 sm:grid-cols-2">
                  {SAMPLE_ROUTES.slice(0, 4).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => plan({ ...DEFAULT_REQ(), startDate: req.startDate, ...r.request, touched: ["days", "travelers"] } as PlanRequest)}
                      className="group flex items-center gap-3 rounded-2xl border border-ink/[0.06] p-2 text-left hover:border-savanna-300 hover:bg-savanna-50/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={unsplash(r.image, 160, 160)} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <span className="min-w-0">
                        <span className="block font-display text-sm font-semibold">{r.title}</span>
                        <span className="block truncate text-xs text-ink-muted">{r.stops}</span>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-savanna-600">
                          {r.days} days <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Phone mockup with a live preview of the product */}
          <div className="relative hidden lg:block">
            <div className="absolute right-10 top-0 h-[540px] w-[290px] rotate-2 rounded-[44px] border-[10px] border-ink bg-white shadow-lift">
              <div className="h-40 overflow-hidden rounded-t-[32px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(PLACE_BY_ID["maasai-mara"].image, 600, 320)} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <p className="font-display text-sm font-bold">10-day Bush & Beach</p>
                {["nairobi", "maasai-mara", "diani"].map((id, i) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-savanna-500 font-display text-xs font-bold text-white">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{PLACE_BY_ID[id].name}</p>
                      <p className="text-[11px] text-ink-muted">{[2, 4, 3][i]} nights</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl bg-sand-50 p-3">
                  <p className="text-[11px] text-ink-muted">Budget used</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-sand-200">
                    <div className="h-full w-2/3 rounded-full bg-savanna-500" />
                  </div>
                </div>
              </div>
            </div>
            <FloatIcon className="right-[300px] top-16 bg-ochre-50 text-ochre-600" icon={<CalendarDays className="h-6 w-6" />} />
            <FloatIcon className="right-[310px] top-64 bg-savanna-50 text-savanna-600" icon={<Moon className="h-6 w-6" />} delay={1} />
            <FloatIcon className="right-2 top-80 bg-maasai-50 text-maasai-500" icon={<Users className="h-6 w-6" />} delay={2} />
          </div>
        </div>
      </section>

      {/* Saved trips */}
      {mounted && sortedTrips.length > 0 && (
        <section className="container-page mt-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">Your trips</p>
              <h2 className="text-2xl font-bold">Pick up where you left off</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTrips.map((t) => (
              <TripCard key={t.id} trip={t} currency={profile.currency} onDelete={() => deleteTrip(t.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Recommended routes — like Stippl's route previews */}
      <section className="container-page mt-14">
        <p className="eyebrow">Recommended routes</p>
        <h2 className="text-2xl font-bold sm:text-3xl">Start from a proven Kenya route</h2>
        <p className="mt-2 max-w-xl text-ink-soft">You start with the route as your base. Everything after that is yours — tweak stops, stays and days however you like.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_ROUTES.map((r) => (
            <Card key={r.id} className="group overflow-hidden">
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(r.image, 800, 400)} alt={r.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <Badge tone="ink" className="absolute left-3 top-3">
                  {r.days} DAYS
                </Badge>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-savanna-600">{r.season}</p>
                <h3 className="mt-1 text-lg font-bold">{r.title}</h3>
                <p className="text-sm text-ink-muted">{r.stops}</p>
                <p className="mt-2 text-sm text-ink-soft">{r.blurb}</p>
                <Button
                  className="mt-4 w-full"
                  variant="soft"
                  onClick={() => plan({ ...DEFAULT_REQ(), startDate: req.startDate, ...r.request, touched: ["days", "travelers"] } as PlanRequest)}
                >
                  Make this route yours
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <AnimatePresence>{generating && <GeneratingOverlay step={step} />}</AnimatePresence>
    </div>
  );
}

function Options({
  req,
  set,
  toggle,
}: {
  req: PlanRequest;
  set: <K extends keyof PlanRequest>(k: K, v: PlanRequest[K]) => void;
  toggle: <T>(list: T[], v: T) => T[];
}) {
  return (
    <div className="mt-5 space-y-5 border-t border-ink/[0.06] pt-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Start date">
          <Input type="date" value={req.startDate} min={todayISO()} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Trip length">
          <Stepper value={req.days} min={2} max={21} onChange={(v) => set("days", v)} suffix="days" />
        </Field>
        <Field label="Travellers">
          <Stepper value={req.travelers} min={1} max={12} onChange={(v) => set("travelers", v)} suffix="people" />
        </Field>
      </div>
      <Field label="Who's going?">
        <div className="flex flex-wrap gap-2">
          {(["solo", "couple", "family", "friends"] as Group[]).map((g) => (
            <Chip key={g} active={req.group === g} onClick={() => set("group", g)} className="capitalize">
              {g}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pace">
          <Segmented<TravelStyle>
            className="w-full"
            value={req.style}
            onChange={(v) => set("style", v)}
            options={[
              { value: "relaxed", label: "Slow" },
              { value: "balanced", label: "Balanced" },
              { value: "packed", label: "Packed" },
            ]}
          />
        </Field>
        <Field label="Budget">
          <Segmented<Tier>
            className="w-full"
            value={req.budget}
            onChange={(v) => set("budget", v)}
            options={[
              { value: "budget", label: "Budget" },
              { value: "mid", label: "Comfort" },
              { value: "luxury", label: "Luxury" },
            ]}
          />
        </Field>
      </div>
      <Field label="Interests">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
            <Chip key={i} active={req.interests.includes(i)} onClick={() => set("interests", toggle(req.interests, i))}>
              {req.interests.includes(i) && <Check className="h-3.5 w-3.5" />}
              {INTEREST_LABELS[i]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Must-see places (optional)">
        <div className="flex flex-wrap gap-2">
          {PLACES.map((p) => (
            <Chip key={p.id} active={req.places.includes(p.id)} onClick={() => set("places", toggle(req.places, p.id))}>
              {req.places.includes(p.id) && <Check className="h-3.5 w-3.5" />}
              {p.name}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border border-ink/10 bg-white px-1.5">
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-sand-100 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease">
        <Minus className="h-4 w-4" />
      </button>
      <span className="font-display text-sm font-semibold">
        {value} <span className="font-sans font-normal text-ink-muted">{suffix}</span>
      </span>
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-sand-100 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function TripCard({ trip, currency, onDelete }: { trip: Trip; currency: Parameters<typeof money>[1]; onDelete: () => void }) {
  const total = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const start = trip.days[0]?.date ?? trip.startDate;
  const end = trip.days[trip.days.length - 1]?.date ?? trip.startDate;
  return (
    <Card className="group relative overflow-hidden">
      <Link href={`/planner/${trip.id}`} className="block">
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trip.cover} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
          <p className="absolute bottom-3 left-4 right-4 font-display text-lg font-bold text-white">{trip.title}</p>
        </div>
        <div className="flex items-center justify-between p-4 text-sm">
          <span className="text-ink-soft">
            {fmtDate(start, { day: "numeric", month: "short" })} – {fmtDate(end, { day: "numeric", month: "short" })}
          </span>
          <span className="font-display font-semibold">{money(total, currency)}</span>
        </div>
      </Link>
      <button
        onClick={onDelete}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-soft opacity-0 transition-opacity hover:text-maasai-500 group-hover:opacity-100"
        aria-label="Delete trip"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Card>
  );
}

function FloatIcon({ className, icon, delay = 0 }: { className: string; icon: React.ReactNode; delay?: number }) {
  return (
    <span className={cn("absolute grid h-14 w-14 animate-floaty place-items-center rounded-2xl shadow-lift", className)} style={{ animationDelay: `${delay}s` }}>
      {icon}
    </span>
  );
}

function GeneratingOverlay({ step }: { step: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-sand-50/90 p-6 backdrop-blur-md">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 animate-ping rounded-3xl bg-savanna-200" />
          <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-savanna-500 text-white shadow-glow">
            <Sparkles className="h-9 w-9" />
          </span>
        </div>
        <h2 className="mt-8 text-2xl font-bold">Building your Kenya itinerary</h2>
        <ul className="mt-6 space-y-3 text-left">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition-all", i <= step ? "bg-white shadow-card" : "opacity-40")}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full", i < step ? "bg-savanna-500 text-white" : i === step ? "border-2 border-savanna-500" : "border-2 border-ink/15")}>
                {i < step && <Check className="h-3.5 w-3.5" />}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
