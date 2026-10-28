"use client";

import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Trip } from "@/lib/planner/types";
import { cn, uid } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, Input, Progress, Select } from "../ui/primitives";

export function PackingTab({ trip, onChange }: { trip: Trip; onChange: (t: Trip) => void }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Essentials");
  const groups = useMemo(() => {
    const m = new Map<string, typeof trip.packing>();
    trip.packing.forEach((p) => m.set(p.category, [...(m.get(p.category) ?? []), p]));
    return [...m.entries()];
  }, [trip.packing]);
  const packed = trip.packing.filter((p) => p.packed).length;
  const categories = Array.from(new Set(["Essentials", ...trip.packing.map((p) => p.category)]));

  const patch = (id: string, v: Partial<Trip["packing"][number]>) => onChange({ ...trip, packing: trip.packing.map((p) => (p.id === id ? { ...p, ...v } : p)) });
  const add = () => {
    if (!label.trim()) return;
    onChange({ ...trip, packing: [...trip.packing, { id: uid("p_"), label: label.trim(), category, packed: false }] });
    setLabel("");
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Packing list</h2>
            <p className="text-sm text-ink-muted">Built for your route — safari layers, reef shoes and documents included.</p>
          </div>
        </div>
        <Progress className="mt-4" value={(packed / Math.max(1, trip.packing.length)) * 100} />
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 sm:grid-cols-[1fr_170px_auto_auto]">
          <Input className="col-span-3 sm:col-span-1" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add an item, e.g. Kikoy for the beach" aria-label="Packing item" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Button variant="dark" onClick={add}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
          <Button variant="outline" onClick={() => onChange({ ...trip, packing: trip.packing.map((p) => ({ ...p, packed: false })) })} title="Uncheck everything" aria-label="Uncheck everything" size="icon" className="h-11 w-11">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <div className="columns-1 gap-5 [column-width:300px]">
        {groups.map(([cat, items]) => (
          <Card key={cat} className="mb-5 break-inside-avoid p-4">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-savanna-600">
              {cat}
            </p>
            <ul>
              {items.map((it) => (
                <li key={it.id} className="group flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-sand-50">
                  <button
                    onClick={() => patch(it.id, { packed: !it.packed })}
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                      it.packed ? "border-savanna-500 bg-savanna-500 text-white" : "border-ink/20",
                    )}
                    aria-label={`${it.packed ? "Unpack" : "Pack"} ${it.label}`}
                  >
                    {it.packed && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <span className={cn("flex-1 text-sm", it.packed && "text-ink-muted line-through")}>{it.label}</span>
                  {trip.travelers > 1 && (
                    <select
                      value={it.assignee ?? ""}
                      onChange={(e) => patch(it.id, { assignee: e.target.value || undefined })}
                      className="max-w-[110px] rounded-lg bg-transparent text-xs text-ink-muted focus:outline-none"
                      aria-label={`Who brings ${it.label}`}
                    >
                      <option value="">Anyone</option>
                      {trip.travelerNames.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => onChange({ ...trip, packing: trip.packing.filter((p) => p.id !== it.id) })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:text-maasai-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    aria-label={`Remove ${it.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
