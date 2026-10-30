"use client";

import { CalendarCheck, Package } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Switch a listing between a product (shipped) and a service (booked), showing the matching fields. */
export function ListingKind({ initial, allowed, product, service }: { initial: "product" | "service"; allowed: ("product" | "service")[]; product: React.ReactNode; service: React.ReactNode }) {
  const [kind, setKind] = useState(initial);
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      {allowed.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          {(
            [
              ["product", Package, "A product", "Something you make and ship"],
              ["service", CalendarCheck, "A service", "Something people book for a date"],
            ] as const
          ).map(([id, Icon, t, d]) => (
            <button key={id} type="button" onClick={() => setKind(id)} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-left", kind === id ? "border-savanna-500 bg-savanna-50" : "border-ink/10")}>
              <Icon className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-display text-sm font-semibold">{t}</span>
                <span className="text-xs text-ink-muted">{d}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={cn("contents", kind !== "product" && "hidden")}>{product}</div>
      <div className={cn("contents", kind !== "service" && "hidden")}>{service}</div>
    </>
  );
}
