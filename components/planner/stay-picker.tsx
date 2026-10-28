"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BedDouble, Check, Coffee, MapPin, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import { staysFor, type Board, type Stay, type StayType } from "@/lib/data/stays";
import type { Stop } from "@/lib/planner/types";
import { cn, money, unsplash, type Currency } from "@/lib/utils";
import { Button } from "../ui/button";
import { Chip, Select } from "../ui/primitives";

type Sort = "recommended" | "price-asc" | "price-desc" | "stars";

/**
 * Accommodation chooser. The AI pick stays the default; travellers can bypass it and compare
 * every nearby property — nightly rate, type, class, breakfast/board and cancellation terms.
 */
export function StayPicker({
  open,
  onClose,
  stop,
  aiPickName,
  travelers,
  currency,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  stop: Stop;
  aiPickName: string;
  travelers: number;
  currency: Currency;
  onPick: (s: Stay | null) => void;
}) {
  const place = PLACE_BY_ID[stop.placeId];
  const all = useMemo(() => staysFor(stop.placeId), [stop.placeId]);
  const [type, setType] = useState<StayType | "Any">("Any");
  const [breakfastOnly, setBreakfastOnly] = useState(false);
  const [freeCancel, setFreeCancel] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState<Sort>("recommended");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const types = Array.from(new Set(all.map((s) => s.type)));
  const prices = all.map((s) => s.perNight);
  const ceiling = Math.max(...prices, 0);
  const rooms = Math.max(1, Math.ceil(travelers / 2));

  const list = all
    .filter((s) => (type === "Any" || s.type === type) && (!breakfastOnly || s.breakfast) && (!freeCancel || s.freeCancellation) && (!maxPrice || s.perNight <= maxPrice))
    .sort((a, b) =>
      sort === "price-asc" ? a.perNight - b.perNight : sort === "price-desc" ? b.perNight - a.perNight : sort === "stars" ? b.stars - a.stars : Number(b.name === aiPickName) - Number(a.name === aiPickName),
    );

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] flex justify-end bg-night/50 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="flex h-full w-full max-w-2xl flex-col bg-sand-50 shadow-lift"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose where to stay in ${place.name}`}
          >
            <div className="border-b border-ink/[0.06] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Where to stay</p>
                  <h2 className="text-2xl font-bold">{place.name}</h2>
                  <p className="text-sm text-ink-muted">
                    {stop.nights} night{stop.nights > 1 ? "s" : ""} · {rooms} room{rooms > 1 ? "s" : ""} for {travelers} · {all.length} properties
                  </p>
                </div>
                <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 hover:bg-sand-50" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
                <Chip active={type === "Any"} onClick={() => setType("Any")}>
                  All types
                </Chip>
                {types.map((t) => (
                  <Chip key={t} active={type === t} onClick={() => setType(t)} className="shrink-0">
                    {t}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip active={breakfastOnly} onClick={() => setBreakfastOnly((v) => !v)}>
                  <Coffee className="h-3.5 w-3.5" /> Breakfast included
                </Chip>
                <Chip active={freeCancel} onClick={() => setFreeCancel((v) => !v)}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Free cancellation
                </Chip>
                <Select value={String(maxPrice)} onChange={(e) => setMaxPrice(Number(e.target.value))} className="h-9 w-auto rounded-full text-xs" aria-label="Maximum nightly rate">
                  <option value="0">Any price</option>
                  {[10000, 20000, 35000, 60000, 100000].filter((v) => v < ceiling).map((v) => (
                    <option key={v} value={v}>
                      Up to {money(v, currency)}/night
                    </option>
                  ))}
                </Select>
                <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="ml-auto h-9 w-auto rounded-full text-xs" aria-label="Sort">
                  <option value="recommended">AI pick first</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="stars">Star class</option>
                </Select>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {list.map((s, i) => (
                <StayCard
                  key={s.id}
                  s={s}
                  i={i}
                  ai={s.name === aiPickName}
                  selected={stop.stayId ? stop.stayId === s.id : s.name === stop.stay}
                  nights={stop.nights}
                  rooms={rooms}
                  currency={currency}
                  onPick={() => {
                    onPick(s);
                    onClose();
                  }}
                />
              ))}
              {!list.length && <p className="rounded-3xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink-muted">No properties match those filters.</p>}
              <p className="px-1 pt-2 text-[11px] leading-relaxed text-ink-muted">
                Star class is the property&apos;s category, not a guest review score. Rates, board basis and cancellation terms are indicative — confirm with the property or booking partner before paying.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ink/[0.06] bg-white p-4">
              <p className="text-xs text-ink-muted">
                AI pick: <span className="font-semibold text-ink">{aiPickName}</span>
              </p>
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  onPick(null);
                  onClose();
                }}
              >
                <Sparkles className="h-4 w-4" /> Use the AI pick
              </Button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StayCard({ s, i, ai, selected, nights, rooms, currency, onPick }: { s: Stay; i: number; ai: boolean; selected: boolean; nights: number; rooms: number; currency: Currency; onPick: () => void }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn("overflow-hidden rounded-3xl bg-white shadow-card ring-2 transition-shadow hover:shadow-lift", selected ? "ring-savanna-500" : "ring-transparent")}
    >
      <div className="grid sm:grid-cols-[200px_1fr]">
        <div className="relative h-44 sm:h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(s.image, 500, 420)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          {ai && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-dusk-500 px-2.5 py-1 font-display text-[11px] font-semibold text-white">
              <Sparkles className="h-3 w-3" /> AI pick
            </span>
          )}
        </div>
        <div className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-savanna-600">{s.type}</p>
              <h3 className="text-lg font-bold leading-tight">{s.name}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex" aria-label={`${s.stars}-star property`}>
                  {Array.from({ length: 5 }, (_, k) => (
                    <Star key={k} className={cn("h-3.5 w-3.5", k < s.stars ? "fill-ochre-400 text-ochre-400" : "text-ink/15")} />
                  ))}
                </span>
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <MapPin className="h-3 w-3" /> {s.area}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-bold">{money(s.perNight, currency)}</p>
              <p className="text-[11px] text-ink-muted">per night</p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {s.features.map((f) => (
              <li key={f} className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px]">
                {f}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className={cn("flex items-center gap-1.5 rounded-xl p-2", s.breakfast ? "bg-savanna-50 text-savanna-700" : "bg-sand-100 text-ink-soft")}>
              <Coffee className="h-3.5 w-3.5 shrink-0" /> <span>{s.board}</span>
            </div>
            <div className={cn("flex items-center gap-1.5 rounded-xl p-2", s.freeCancellation ? "bg-savanna-50 text-savanna-700" : "bg-maasai-50 text-maasai-600")}>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> <span>{s.cancellation}</span>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">
              {nights} night{nights > 1 ? "s" : ""} × {rooms} room{rooms > 1 ? "s" : ""} ≈ <span className="font-semibold text-ink">{money(s.perNight * nights * rooms, currency)}</span>
            </p>
            <Button size="sm" variant={selected ? "soft" : "primary"} onClick={onPick}>
              {selected ? <Check className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />} {selected ? "Selected" : "Choose"}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
