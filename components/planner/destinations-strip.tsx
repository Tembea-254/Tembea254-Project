"use client";

import Link from "next/link";
import { Images, MoonStar, Orbit } from "lucide-react";
import { useState } from "react";
import { placeMedia } from "@/lib/data/place-media";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { Trip } from "@/lib/planner/types";
import { addDays, fmtDate, unsplash } from "@/lib/utils";
import { Gallery } from "./gallery";

/** "Where you're going" — photo-led destination cards with gallery + 360° preview. */
export function DestinationsStrip({ trip, onFocus }: { trip: Trip; onFocus?: (placeId: string) => void }) {
  const [gallery, setGallery] = useState<string | null>(null);
  let offset = 0;
  const cards = trip.stops.map((s, i) => {
    const start = addDays(trip.startDate, offset);
    offset += s.nights;
    return { s, i, start, end: addDays(trip.startDate, offset) };
  });
  const g = gallery ? PLACE_BY_ID[gallery] : null;
  const gm = gallery ? placeMedia(gallery) : null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="eyebrow">Where you&apos;re going</p>
          <h2 className="text-xl font-bold">
            {trip.stops.length} destinations · {trip.days.length} days
          </h2>
        </div>
      </div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {cards.map(({ s, i, start, end }) => {
          const p = PLACE_BY_ID[s.placeId];
          const m = placeMedia(s.placeId);
          const [a, b, c] = [m.photos[0], m.photos[1] ?? m.photos[0], m.photos[2] ?? m.photos[0]];
          return (
            <article key={s.id} onMouseEnter={() => onFocus?.(s.placeId)} className="w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card sm:w-[300px]">
              <button onClick={() => setGallery(s.placeId)} className="group relative grid h-44 w-full grid-cols-3 grid-rows-2 gap-1 overflow-hidden" aria-label={`View photos of ${p.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(a, 500, 360)} alt={p.name} className="col-span-2 row-span-2 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(b, 200, 180)} alt="" className="h-full w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(c, 200, 180)} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-savanna-500 font-display text-sm font-bold text-white ring-2 ring-white">{i + 1}</span>
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-night/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <Images className="h-3.5 w-3.5" /> {m.photos.length}
                </span>
              </button>
              <div className="p-4">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MoonStar className="h-3.5 w-3.5" /> {s.nights} night{s.nights > 1 ? "s" : ""} · {fmtDate(start, { day: "numeric", month: "short" })} – {fmtDate(end, { day: "numeric", month: "short" })}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.blurb}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setGallery(s.placeId)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/10 font-display text-xs font-semibold hover:bg-sand-50">
                    <Images className="h-4 w-4" /> Photos
                  </button>
                  {m.vrSlug && (
                    <Link href={`/vr/${m.vrSlug}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink font-display text-xs font-semibold text-white hover:bg-ink/90">
                      <Orbit className="h-4 w-4" /> 360° preview
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {g && gm && <Gallery open title={g.name} photos={gm.photos} vrSlug={gm.vrSlug} onClose={() => setGallery(null)} />}
    </section>
  );
}
