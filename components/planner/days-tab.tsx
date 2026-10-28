"use client";

import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  ArrowDownUp,
  BedDouble,
  Bus,
  ChevronDown,
  Clock,
  GripVertical,
  Orbit,
  Lightbulb,
  Plus,
  Sparkles,
  StickyNote,
  Ticket,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { Day, Item, ItemType, Trip } from "@/lib/planner/types";
import { computePlanned } from "@/lib/planner/engine";
import { cn, fmtDate, fmtDuration, money, uid, unsplash, type Currency } from "@/lib/utils";
import { Button } from "../ui/button";
import { DestinationsStrip } from "./destinations-strip";
import { placeMedia } from "@/lib/data/place-media";
import Link from "next/link";
import { Card, Input, Select, Textarea } from "../ui/primitives";

const TYPE_META: Record<ItemType, { icon: typeof Ticket; tone: string; label: string }> = {
  activity: { icon: Ticket, tone: "bg-savanna-50 text-savanna-600", label: "Activity" },
  meal: { icon: UtensilsCrossed, tone: "bg-ochre-50 text-ochre-600", label: "Meal" },
  transport: { icon: Bus, tone: "bg-maasai-50 text-maasai-500", label: "Transport" },
  stay: { icon: BedDouble, tone: "bg-dusk-50 text-dusk-500", label: "Stay" },
  note: { icon: StickyNote, tone: "bg-sand-100 text-ink-soft", label: "Note" },
};

export function DaysTab({
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
  const [open, setOpen] = useState<string | null>(null);

  const commit = (days: Day[]) => {
    const next = { ...trip, days };
    onChange({ ...next, planned: computePlanned(next) });
  };
  const updateDay = (dayId: string, fn: (d: Day) => Day) => commit(trip.days.map((d) => (d.id === dayId ? fn(d) : d)));
  const moveItem = (fromDay: string, itemId: string, toDay: string) => {
    const item = trip.days.find((d) => d.id === fromDay)?.items.find((i) => i.id === itemId);
    if (!item) return;
    commit(
      trip.days.map((d) =>
        d.id === fromDay ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d.id === toDay ? { ...d, items: [...d.items, item].sort(byTime) } : d,
      ),
    );
  };

  return (
    <div>
      <DestinationsStrip trip={trip} onFocus={onFocusPlace} />
      <div className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {trip.days.map((d, i) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            onClick={() => onFocusPlace(d.placeId)}
            className="shrink-0 rounded-2xl border border-ink/10 bg-white px-3 py-2 text-center hover:border-savanna-400"
          >
            <span className="block font-display text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Day {i + 1}</span>
            <span className="block text-sm font-medium">{fmtDate(d.date, { day: "numeric", month: "short" })}</span>
          </a>
        ))}
      </div>

      <div className="space-y-5">
        {trip.days.map((d, i) => (
          <DayCard
            key={d.id}
            day={d}
            index={i}
            trip={trip}
            currency={currency}
            openItem={open}
            setOpenItem={setOpen}
            onFocus={() => onFocusPlace(d.placeId)}
            onUpdate={(fn) => updateDay(d.id, fn)}
            onMove={(itemId, toDay) => moveItem(d.id, itemId, toDay)}
          />
        ))}
      </div>
    </div>
  );
}

const byTime = (a: Item, b: Item) => a.time.localeCompare(b.time);

function DayCard({
  day,
  index,
  trip,
  currency,
  openItem,
  setOpenItem,
  onFocus,
  onUpdate,
  onMove,
}: {
  day: Day;
  index: number;
  trip: Trip;
  currency: Currency;
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
  onFocus: () => void;
  onUpdate: (fn: (d: Day) => Day) => void;
  onMove: (itemId: string, toDay: string) => void;
}) {
  const [items, setItems] = useState(day.items);
  const [adding, setAdding] = useState(false);
  // keep local drag order in sync with persisted changes
  useEffect(() => setItems(day.items), [day.items]);
  const synced = items;

  const p = PLACE_BY_ID[day.placeId];
  const dayCost = day.items.reduce((a, i) => a + i.cost, 0);
  const suggestions = p.activities.filter((a) => !trip.days.some((d) => d.items.some((i) => i.title === a.title))).slice(0, 4);

  return (
    <Card id={day.id} className="scroll-mt-32 overflow-hidden" onMouseEnter={onFocus}>
      <div className="flex items-center gap-4 border-b border-ink/[0.06] p-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(p.image, 160, 160)} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-savanna-600">
            Day {index + 1} · {fmtDate(day.date)} · {p.name}
          </p>
          <input
            value={day.title}
            onChange={(e) => onUpdate((d) => ({ ...d, title: e.target.value }))}
            className="w-full truncate bg-transparent font-display text-lg font-bold outline-none focus:text-savanna-700"
            aria-label={`Day ${index + 1} title`}
          />
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-ink-muted">Day cost</p>
          <p className="font-display text-sm font-semibold">{money(dayCost, currency)}</p>
        </div>
        {placeMedia(day.placeId).vrSlug && (
          <Link
            href={`/vr/${placeMedia(day.placeId).vrSlug}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white hover:bg-ink/90"
            title={`Preview ${p.name} in 360°`}
            aria-label={`Preview ${p.name} in 360°`}
          >
            <Orbit className="h-4 w-4" />
          </Link>
        )}
      </div>

      <Reorder.Group axis="y" values={synced} onReorder={setItems} className="divide-y divide-ink/[0.05]">
        {synced.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            days={trip.days}
            dayId={day.id}
            currency={currency}
            open={openItem === item.id}
            onToggle={() => setOpenItem(openItem === item.id ? null : item.id)}
            onDragEnd={() => onUpdate((d) => ({ ...d, items }))}
            onChange={(patch) => onUpdate((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) }))}
            onDelete={() => onUpdate((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }))}
            onMove={(to) => onMove(item.id, to)}
          />
        ))}
      </Reorder.Group>

      <div className="border-t border-ink/[0.06] bg-sand-50/60 p-3">
        <AnimatePresence initial={false}>
          {adding ? (
            <motion.div key="add" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <AddItem
                suggestions={suggestions.map((s) => ({ title: s.title, time: s.time, cost: s.cost * trip.travelers, minutes: s.minutes, notes: s.note }))}
                onAdd={(it) => {
                  onUpdate((d) => ({ ...d, items: [...d.items, { id: uid("i_"), ...it }].sort(byTime) }));
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </motion.div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add to day
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onUpdate((d) => ({ ...d, items: [...d.items].sort(byTime) }))}>
                <ArrowDownUp className="h-4 w-4" /> Sort by time
              </Button>
              {suggestions[0] && (
                <span className="ml-auto hidden items-center gap-1.5 text-xs text-ink-muted md:inline-flex">
                  <Lightbulb className="h-3.5 w-3.5 text-ochre-500" /> Idea: {suggestions[0].title}
                </span>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function ItemRow({
  item,
  days,
  dayId,
  currency,
  open,
  onToggle,
  onDragEnd,
  onChange,
  onDelete,
  onMove,
}: {
  item: Item;
  days: Day[];
  dayId: string;
  currency: Currency;
  open: boolean;
  onToggle: () => void;
  onDragEnd: () => void;
  onChange: (patch: Partial<Item>) => void;
  onDelete: () => void;
  onMove: (toDay: string) => void;
}) {
  const controls = useDragControls();
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} className="bg-white">
      <div className={cn("flex items-center gap-3 px-3 py-3 sm:px-4", item.done && "opacity-60")}>
        <button className="cursor-grab touch-none text-ink-muted/60 hover:text-ink-muted active:cursor-grabbing" onPointerDown={(e) => controls.start(e)} aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4" />
        </button>
        <input
          type="checkbox"
          checked={!!item.done}
          onChange={(e) => onChange({ done: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-savanna-500"
          aria-label={`Mark ${item.title} done`}
        />
        <span className="w-12 shrink-0 font-display text-sm font-semibold tabular-nums text-ink-soft">{item.time}</span>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", meta.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className={cn("block truncate text-sm font-medium", item.done && "line-through")}>{item.title}</span>
          {(item.notes || item.minutes) && (
            <span className="block truncate text-xs text-ink-muted">
              {item.minutes ? `${fmtDuration(item.minutes)}` : ""}
              {item.minutes && item.notes ? " · " : ""}
              {item.notes}
            </span>
          )}
        </button>
        {item.cost > 0 && <span className="hidden shrink-0 text-xs font-semibold text-ink-soft sm:block">{money(item.cost, currency)}</span>}
        <button onClick={onToggle} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-sand-100" aria-label="Edit item">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-3 bg-sand-50/70 px-4 pb-4 pt-2 sm:grid-cols-[110px_1fr_140px]">
              <label className="text-xs text-ink-muted">
                Time
                <Input type="time" value={item.time} onChange={(e) => onChange({ time: e.target.value })} className="mt-1" />
              </label>
              <label className="text-xs text-ink-muted">
                Title
                <Input value={item.title} onChange={(e) => onChange({ title: e.target.value })} className="mt-1" />
              </label>
              <label className="text-xs text-ink-muted">
                Cost (KES, group)
                <Input type="number" min={0} value={item.cost} onChange={(e) => onChange({ cost: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" />
              </label>
              <label className="text-xs text-ink-muted sm:col-span-2">
                Notes
                <Textarea rows={2} value={item.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} className="mt-1 p-3" />
              </label>
              <div className="space-y-2">
                <label className="block text-xs text-ink-muted">
                  Type
                  <Select value={item.type} onChange={(e) => onChange({ type: e.target.value as ItemType })} className="mt-1">
                    {(Object.keys(TYPE_META) as ItemType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_META[t].label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  Move to
                  <Select value={dayId} onChange={(e) => onMove(e.target.value)} className="h-9 w-auto">
                    {days.map((d, i) => (
                      <option key={d.id} value={d.id}>
                        Day {i + 1} · {fmtDate(d.date, { day: "numeric", month: "short" })}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button variant="danger" size="sm" className="ml-auto" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function AddItem({
  suggestions,
  onAdd,
  onCancel,
}: {
  suggestions: Omit<Item, "id" | "type">[];
  onAdd: (i: Omit<Item, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState<ItemType>("activity");
  const [cost, setCost] = useState(0);
  return (
    <div className="space-y-3 p-1">
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-display text-xs font-semibold text-ink-muted">
            <Sparkles className="h-3.5 w-3.5 text-savanna-500" /> Suggested nearby
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.title}
                onClick={() => onAdd({ ...s, type: "activity" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-savanna-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-savanna-50"
              >
                <Plus className="h-3 w-3" /> {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[100px_1fr_130px_120px]">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your own plan, e.g. Coffee farm tour" aria-label="Title" />
        <Select value={type} onChange={(e) => setType(e.target.value as ItemType)} aria-label="Type">
          {(Object.keys(TYPE_META) as ItemType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </Select>
        <Input type="number" min={0} value={cost || ""} onChange={(e) => setCost(Number(e.target.value) || 0)} placeholder="Cost KES" aria-label="Cost" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!title.trim()} onClick={() => onAdd({ title: title.trim(), time, type, cost })}>
          <Clock className="h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
