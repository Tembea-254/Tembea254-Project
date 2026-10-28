"use client";

import { Reorder, useDragControls } from "framer-motion";
import Link from "next/link";
import { BedDouble, Bus, GripVertical, Minus, Orbit, Plane, Plus, TrainFront, X } from "lucide-react";
import { placeMedia } from "@/lib/data/place-media";
import { useEffect, useState } from "react";
import { PLACES, PLACE_BY_ID, type Tier } from "@/lib/data/places";
import { estimateLeg, rebuildFromStops } from "@/lib/planner/engine";
import type { Stop, Trip } from "@/lib/planner/types";
import { cn, fmtDuration, money, uid, unsplash, type Currency } from "@/lib/utils";
import { Badge, Card, Select } from "../ui/primitives";

export function RouteTab({
  trip,
  onChange,
  onFocusPlace,
  currency,
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
  onFocusPlace: (id?: string) => void;
  currency: Currency;
}) {
  const [order, setOrder] = useState<Stop[]>(trip.stops);
  useEffect(() => setOrder(trip.stops), [trip.stops]);

  const commit = (stops: Stop[]) => onChange(rebuildFromStops({ ...trip, stops }));
  const nights = order.reduce((a, s) => a + s.nights, 0);
  const available = PLACES.filter((p) => !order.some((s) => s.placeId === p.id));

  const setNights = (id: string, delta: number) => commit(order.map((s) => (s.id === id ? { ...s, nights: Math.max(1, Math.min(10, s.nights + delta)) } : s)));
  const setStay = (id: string, tier: Tier) =>
    commit(order.map((s) => (s.id === id ? { ...s, stay: PLACE_BY_ID[s.placeId].stays[tier].name, stayPerNight: PLACE_BY_ID[s.placeId].stays[tier].perNight } : s)));
  const remove = (id: string) => order.length > 1 && commit(order.filter((s) => s.id !== id));
  const add = (placeId: string) => {
    const p = PLACE_BY_ID[placeId];
    commit([...order, { id: uid("s_"), placeId, nights: p.idealNights, stay: p.stays[trip.budget].name, stayPerNight: p.stays[trip.budget].perNight }]);
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">Your route</h2>
          <p className="text-sm text-ink-muted">
            {order.length} stops · {nights} nights · drag to reorder, days update automatically
          </p>
        </div>
        <Badge tone="green">{nights + 1} days</Badge>
      </div>

      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-0">
        {order.map((s, i) => (
          <div key={s.id}>
            {i > 0 && <LegPill from={order[i - 1].placeId} to={s.placeId} currency={currency} travelers={trip.travelers} />}
            <StopRow
              stop={s}
              index={i}
              tier={tierOf(s)}
              onDragEnd={() => {
                if (order.map((o) => o.id).join() !== trip.stops.map((o) => o.id).join()) commit(order);
              }}
              onNights={(d) => setNights(s.id, d)}
              onStay={(t) => setStay(s.id, t)}
              onRemove={() => remove(s.id)}
              onHover={() => onFocusPlace(s.placeId)}
              canRemove={order.length > 1}
            />
          </div>
        ))}
      </Reorder.Group>

      {available.length > 0 && (
        <Card className="mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="font-display text-sm font-semibold">Add a stop</p>
          <Select
            value=""
            onChange={(e) => e.target.value && add(e.target.value)}
            className="sm:max-w-xs"
            aria-label="Add a stop"
          >
            <option value="">Choose a destination…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.blurb}
              </option>
            ))}
          </Select>
        </Card>
      )}
    </div>
  );
}

function tierOf(s: Stop): Tier {
  const st = PLACE_BY_ID[s.placeId].stays;
  return (Object.keys(st) as Tier[]).find((t) => st[t].name === s.stay) ?? "mid";
}

function StopRow({
  stop,
  index,
  tier,
  onDragEnd,
  onNights,
  onStay,
  onRemove,
  onHover,
  canRemove,
}: {
  stop: Stop;
  index: number;
  tier: Tier;
  onDragEnd: () => void;
  onNights: (d: number) => void;
  onStay: (t: Tier) => void;
  onRemove: () => void;
  onHover: () => void;
  canRemove: boolean;
}) {
  const controls = useDragControls();
  const p = PLACE_BY_ID[stop.placeId];
  return (
    <Reorder.Item value={stop} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} className="relative" onMouseEnter={onHover}>
      <Card className="flex gap-3 p-3 sm:gap-4">
        <button
          className="hidden cursor-grab touch-none items-center text-ink-muted active:cursor-grabbing sm:flex"
          onPointerDown={(e) => controls.start(e)}
          aria-label={`Drag ${p.name}`}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-32" onPointerDown={(e) => controls.start(e)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(p.image, 300, 300)} alt={p.name} className="h-full w-full object-cover" draggable={false} />
          <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-savanna-500 font-display text-xs font-bold text-white ring-2 ring-white">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold sm:text-lg">{p.name}</h3>
              <p className="truncate text-sm text-ink-muted">{p.blurb}</p>
            </div>
            {canRemove && (
              <button onClick={onRemove} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-maasai-50 hover:text-maasai-500" aria-label={`Remove ${p.name}`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-ink/10">
              <button onClick={() => onNights(-1)} disabled={stop.nights <= 1} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-30" aria-label="Fewer nights">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[64px] text-center font-display text-sm font-semibold">
                {stop.nights} night{stop.nights > 1 ? "s" : ""}
              </span>
              <button onClick={() => onNights(1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand-100" aria-label="More nights">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {placeMedia(stop.placeId).vrSlug && (
              <Link href={`/vr/${placeMedia(stop.placeId).vrSlug}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 font-display text-xs font-semibold text-white">
                <Orbit className="h-3.5 w-3.5" /> 360°
              </Link>
            )}
            <label className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
              <BedDouble className="h-4 w-4 shrink-0 text-ink-muted" />
              <select
                value={tier}
                onChange={(e) => onStay(e.target.value as Tier)}
                className="min-w-0 truncate rounded-lg bg-transparent py-1 pr-1 font-medium text-ink focus:outline-none"
                aria-label={`Stay in ${p.name}`}
              >
                {(Object.keys(p.stays) as Tier[]).map((t) => (
                  <option key={t} value={t}>
                    {p.stays[t].name} ({t})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>
    </Reorder.Item>
  );
}

function LegPill({ from, to, currency, travelers }: { from: string; to: string; currency: Currency; travelers: number }) {
  const leg = estimateLeg(from, to);
  const Icon = leg.mode === "flight" ? Plane : leg.mode === "train" ? TrainFront : Bus;
  return (
    <div className="flex items-center gap-3 py-2 pl-[58px] sm:pl-[92px]">
      <span className="h-6 w-px border-l-2 border-dashed border-ink/15" />
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          leg.mode === "flight" ? "bg-dusk-50 text-dusk-500" : leg.mode === "train" ? "bg-ochre-50 text-ochre-600" : "bg-maasai-50 text-maasai-600",
        )}
      >
        <Icon className="h-3.5 w-3.5" /> {fmtDuration(leg.minutes)} · {leg.label}
      </span>
      <span className="text-xs text-ink-muted">
        {leg.km} km · ~{money(leg.cost * travelers, currency)}
      </span>
    </div>
  );
}
