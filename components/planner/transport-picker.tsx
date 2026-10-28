"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bus, Car, Check, ChevronDown, Info, Plane, Ship, TrainFront, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { transportOptions, type TransportMode } from "@/lib/planner/transport";
import { cn, fmtDuration, money, type Currency } from "@/lib/utils";

export const MODE_ICON: Record<TransportMode, typeof Car> = { drive: Car, van: Truck, flight: Plane, train: TrainFront, bus: Bus, ferry: Ship };
export const MODE_TONE: Record<TransportMode, string> = {
  drive: "bg-sand-100 text-ink",
  van: "bg-maasai-50 text-maasai-600",
  flight: "bg-dusk-50 text-dusk-500",
  train: "bg-ochre-50 text-ochre-600",
  bus: "bg-savanna-50 text-savanna-700",
  ferry: "bg-[#e6f3fb] text-[#1b6fa8]",
};

/** Leg between two stops: shows the chosen way to travel and lets the traveller compare every option. */
export function TransportPicker({
  from,
  to,
  travelers,
  currency,
  value,
  onChange,
}: {
  from: string;
  to: string;
  travelers: number;
  currency: Currency;
  value?: TransportMode;
  onChange: (m: TransportMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = useMemo(() => transportOptions(from, to, travelers), [from, to, travelers]);
  const chosen = opts.find((o) => o.mode === value) ?? opts.find((o) => o.recommended) ?? opts[0];
  if (!chosen) return null;
  const Icon = MODE_ICON[chosen.mode];

  return (
    <div className="py-2 pl-[58px] sm:pl-[92px]">
      <button onClick={() => setOpen((o) => !o)} className="group flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className="h-6 w-px border-l-2 border-dashed border-ink/15" />
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", MODE_TONE[chosen.mode])}>
          <Icon className="h-3.5 w-3.5" /> {fmtDuration(chosen.minutes)} · {chosen.label}
        </span>
        <span className="text-xs text-ink-muted">~{money(chosen.total, currency)}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-ink/10 px-2.5 py-1 text-xs font-semibold text-ink-soft group-hover:border-savanna-400">
          {opts.length} ways <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="mt-3 space-y-2">
              {opts.map((o) => {
                const I = MODE_ICON[o.mode];
                const on = o.mode === chosen.mode;
                return (
                  <li key={o.mode}>
                    <button
                      onClick={() => {
                        onChange(o.mode);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                        on ? "border-savanna-500 bg-savanna-50/60" : "border-ink/10 bg-white hover:border-ink/25",
                      )}
                    >
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", MODE_TONE[o.mode])}>
                        <I className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-semibold">{o.label}</span>
                          {o.recommended && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">Recommended</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{o.steps.join("  ›  ")}</span>
                        {o.notes.length > 0 && (
                          <span className="mt-1 flex items-start gap-1 text-[11px] text-ink-muted">
                            <Info className="mt-0.5 h-3 w-3 shrink-0" /> {o.notes.join(" · ")}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-sm font-bold">{fmtDuration(o.minutes)}</span>
                        <span className="block text-xs text-ink-soft">{money(o.total, currency)}</span>
                        <span className="block text-[10px] text-ink-muted">{money(o.perPerson, currency)}/person</span>
                      </span>
                      {on && <Check className="mt-1 h-4 w-4 shrink-0 text-savanna-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-ink-muted">Times and fares are indicative estimates from distance and route — confirm with the operator when booking.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
