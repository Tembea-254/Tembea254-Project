"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bus, Check, Clock, Plus, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { ACTIVITY_CATEGORIES, toursFor, type ActivityCategory, type Tour } from "@/lib/data/activities";
import { PLACE_BY_ID } from "@/lib/data/places";
import { computePlanned } from "@/lib/planner/engine";
import type { Trip } from "@/lib/planner/types";
import { cn, fmtDate, fmtDuration, money, uid, unsplash, type Currency } from "@/lib/utils";
import { Button } from "../ui/button";
import { Chip, Select } from "../ui/primitives";

type Sort = "picks" | "price" | "duration";

export function ToursExplorer({ trip, onChange, currency, initialPlace }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency; initialPlace?: string }) {
  const places = useMemo(() => Array.from(new Set(trip.stops.map((s) => s.placeId))).filter((id) => toursFor(id).length), [trip.stops]);
  const [place, setPlace] = useState(initialPlace && places.includes(initialPlace) ? initialPlace : places[0]);
  const [cat, setCat] = useState<ActivityCategory | "All">("All");
  const [sort, setSort] = useState<Sort>("picks");
  const [toast, setToast] = useState<string | null>(null);

  const all = toursFor(place ?? "");
  const cats = ACTIVITY_CATEGORIES.filter((c) => all.some((t) => t.category === c));
  const list = all
    .filter((t) => cat === "All" || t.category === cat)
    .sort((a, b) => (sort === "price" ? a.priceFrom - b.priceFrom : sort === "duration" ? a.duration - b.duration : Number(!!b.pick) - Number(!!a.pick)));
  const daysHere = trip.days.map((d, i) => ({ d, i })).filter(({ d }) => d.placeId === place);
  const added = new Set(trip.days.flatMap((d) => d.items.map((i) => i.title)));

  const addTo = (tour: Tour, dayId: string) => {
    const days = trip.days.map((d) =>
      d.id !== dayId
        ? d
        : {
            ...d,
            items: [
              ...d.items,
              {
                id: uid("i_"),
                time: tour.startTime,
                title: tour.title,
                type: "activity" as const,
                minutes: tour.duration,
                cost: tour.priceFrom * trip.travelers,
                notes: tour.includes.length ? `Includes: ${tour.includes.join(", ")}` : undefined,
              },
            ].sort((a, b) => a.time.localeCompare(b.time)),
          },
    );
    const next = { ...trip, days };
    onChange({ ...next, planned: computePlanned(next) });
    const di = trip.days.findIndex((d) => d.id === dayId);
    setToast(`Added to Day ${di + 1}`);
    setTimeout(() => setToast(null), 2200);
  };

  if (!places.length) return <p className="rounded-3xl border border-dashed border-ink/15 p-8 text-center text-ink-muted">No tours listed for these stops yet.</p>;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Things to do</h2>
        <p className="text-sm text-ink-muted">Tours and experiences around each stop — add any of them straight into your days.</p>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {places.map((id) => (
          <button
            key={id}
            onClick={() => {
              setPlace(id);
              setCat("All");
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 font-display text-sm font-semibold transition-colors",
              place === id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white hover:border-ink/30",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unsplash(PLACE_BY_ID[id].image, 80, 80)} alt="" className="h-8 w-8 rounded-full object-cover" />
            {PLACE_BY_ID[id].name}
            <span className={cn("text-xs font-normal", place === id ? "text-white/60" : "text-ink-muted")}>{toursFor(id).length}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip active={cat === "All"} onClick={() => setCat("All")}>
          All
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="ml-auto h-9 w-auto rounded-full text-xs" aria-label="Sort tours">
          <option value="picks">Tembea picks first</option>
          <option value="price">Price: low to high</option>
          <option value="duration">Shortest first</option>
        </Select>
      </div>

      <div key={`${place}-${cat}-${sort}`} className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
        {list.map((t, i) => (
            <motion.article
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.3 }}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="relative h-40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(t.image, 640, 360)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-display text-[11px] font-semibold">{t.category}</span>
                {t.pick && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ochre-400 px-2.5 py-1 font-display text-[11px] font-semibold text-ink">
                    <Sparkles className="h-3 w-3" /> Tembea pick
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-base font-bold leading-snug">{t.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {fmtDuration(t.duration)}
                  </span>
                  {t.pickup && (
                    <span className="inline-flex items-center gap-1">
                      <Bus className="h-3.5 w-3.5" /> Pick-up
                    </span>
                  )}
                  {t.freeCancellation && (
                    <span className="inline-flex items-center gap-1 text-savanna-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Free cancellation
                    </span>
                  )}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {t.highlights.slice(0, 3).map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-savanna-500" /> {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <p>
                    <span className="block text-[11px] text-ink-muted">From</span>
                    <span className="font-display text-lg font-bold">{t.priceFrom ? money(t.priceFrom, currency) : "Free"}</span>
                    {t.priceFrom > 0 && <span className="text-xs text-ink-muted"> /person</span>}
                  </p>
                  {added.has(t.title) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-savanna-50 px-3 py-2 font-display text-xs font-semibold text-savanna-700">
                      <Check className="h-4 w-4" /> In your plan
                    </span>
                  ) : daysHere.length === 1 ? (
                    <Button size="sm" onClick={() => addTo(t, daysHere[0].d.id)}>
                      <Plus className="h-4 w-4" /> Add to Day {daysHere[0].i + 1}
                    </Button>
                  ) : daysHere.length ? (
                    <Select
                      value=""
                      onChange={(e) => e.target.value && addTo(t, e.target.value)}
                      className="h-9 w-auto rounded-full border-savanna-500 bg-savanna-500 text-xs font-semibold text-white"
                      aria-label={`Add ${t.title} to a day`}
                    >
                      <option value="">+ Add to day…</option>
                      {daysHere.map(({ d, i }) => (
                        <option key={d.id} value={d.id} className="text-ink">
                          Day {i + 1} · {fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                </div>
              </div>
            </motion.article>
          ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Ticket className="h-3.5 w-3.5" /> Prices are indicative per person. Book with verified vendors in the Marketplace.
      </p>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lift lg:bottom-8">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-savanna-400" /> {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
