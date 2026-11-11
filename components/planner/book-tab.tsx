"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { BUFFER_PCT } from "@/lib/planner/engine";
import type { Trip } from "@/lib/planner/types";
import { money, type Currency } from "@/lib/utils";
import { CompareWorkspace } from "./compare-workspace";

/**
 * Compare & book. The trip priced as planned, then a workspace to search everything bookable at the
 * trip's stops (Tembea254 providers, B2B partners, hotels, affiliate platforms, offers found online),
 * compare up to three side by side, put a choice into the plan, and book it.
 */
export function BookTab({ trip, onChange, currency }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency }) {
  const planned = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const days = trip.days.length;
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-ink p-5 text-white">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/60">Your trip, priced</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-bold">{money(planned, currency)}</p>
            <p className="text-sm text-white/70">
              {trip.travelers} {trip.travelers === 1 ? "traveller" : "travellers"} · {days} days · {money(planned / trip.travelers, currency)} per person
            </p>
          </div>
          <p className="flex max-w-sm items-start gap-2 text-xs text-white/60">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Includes a {Math.round(BUFFER_PCT * 100)}% buffer for price changes and tips. Choices you add below update this total.{" "}
            <Link href="/bookings" className="font-semibold text-savanna-300 underline">
              My bookings
            </Link>
          </p>
        </div>
      </div>

      <CompareWorkspace trip={trip} onChange={onChange} currency={currency} />

    </div>
  );
}
