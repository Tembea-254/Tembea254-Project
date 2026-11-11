"use client";

import { BadgeCheck, BedDouble, Car, Check, ExternalLink, Info, MapPin, Sparkles, Star, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PLACE_BY_ID, type Tier } from "@/lib/data/places";
import { staysFor, type Stay } from "@/lib/data/stays";
import { bookingUrl, mapsUrl, rankPackages } from "@/lib/planner/compare";
import { BUFFER_PCT, computePlanned } from "@/lib/planner/engine";
import { LivePackages, LocalServices } from "./live-offers";
import { cachedOffers, loadOffers } from "./offers-client";
import type { Trip } from "@/lib/planner/types";
import type { OfferView } from "@/lib/repo/partners";
import { cn, money, unsplash, type Currency } from "@/lib/utils";

/**
 * Compare & book: the trip's stops matched against partner safari packages (side by side, like
 * comparing ride prices), stays at every stop by price level, and transport. One honest
 * "Tembea pick" per section, computed from fit, price and rating; sponsorship never changes it.
 */

const TIER_LABEL: Record<Tier, string> = { budget: "Budget", mid: "Mid-range", luxury: "Premium" };

type Sort = "pick" | "price" | "rating";

export function BookTab({ trip, onChange, currency }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency }) {
  const [offers, setOffers] = useState<OfferView[] | null>(cachedOffers());
  const [sort, setSort] = useState<Sort>("pick");
  const [stopId, setStopId] = useState(trip.stops[0]?.id);
  useEffect(() => {
    loadOffers()
      .then(setOffers)
      .catch(() => setOffers([]));
  }, []);

  const places = useMemo(() => [...new Set(trip.stops.map((s) => s.placeId))], [trip.stops]);
  const nights = trip.stops.reduce((a, s) => a + s.nights, 0);
  const days = trip.days.length || nights + 1;
  const planned = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const rooms = Math.max(1, Math.ceil(trip.travelers / 2));

  /* ---------- packages: fit, price and rating, scored the same way for everyone ---------- */
  const packages = useMemo(() => rankPackages(offers ?? [], trip), [offers, trip]);

  const pick = packages.length ? packages.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const cheapest = packages.length ? packages.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  const topRated = packages.length ? packages.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) ? b : a)) : null;
  const sorted = [...packages].sort((a, b) => {
    // paid placement: sponsored partners are shown first (and labelled), the badges stay honest
    if (a.partner.sponsored !== b.partner.sponsored) return a.partner.sponsored ? -1 : 1;
    return sort === "price" ? a.total - b.total : sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : b.score - a.score;
  });

  /* ---------- stays ---------- */
  const stop = trip.stops.find((s) => s.id === stopId) ?? trip.stops[0];
  const stays = stop ? staysFor(stop.placeId) : [];
  const bestStay = (tier: Tier) => {
    const inTier = stays.filter((s) => s.tier === tier);
    if (!inTier.length) return null;
    return inTier.reduce((a, b) => (valueScore(b) > valueScore(a) ? b : a));
  };
  const recommended = stop ? bestStay(trip.budget) : null;
  const useStay = (st: Stay) => {
    const stops = trip.stops.map((s) => (s.id === stop!.id ? { ...s, stay: st.name, stayPerNight: st.perNight, stayId: st.id } : s));
    const next = { ...trip, stops, updatedAt: Date.now() };
    onChange({ ...next, planned: computePlanned(next) });
  };


  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-ink p-5 text-white">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/60">Your trip, priced</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-bold">{money(planned, currency)}</p>
            <p className="text-sm text-white/70">
              Doing it yourself · {trip.travelers} {trip.travelers === 1 ? "traveller" : "travellers"} · {days} days · {money(planned / trip.travelers, currency)} per person
            </p>
          </div>
          <p className="flex max-w-sm items-start gap-2 text-xs text-white/60">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Includes a {Math.round(BUFFER_PCT * 100)}% buffer for price changes and tips, so you aren&apos;t caught short. Compare it with the packages below.
          </p>
        </div>
      </div>

      <LivePackages trip={trip} currency={currency} />

      {/* ---------------- Partner packages ---------------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Tembea254 partner packages</h2>
            <p className="text-sm text-ink-muted">Operators listed with us, compared for your stops and priced for your group.</p>
          </div>
          <div className="flex gap-1 rounded-full bg-sand-100 p-1 text-sm">
            {(
              [
                ["pick", "Best match"],
                ["price", "Cheapest"],
                ["rating", "Top rated"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setSort(v)} className={cn("rounded-full px-3 py-1.5 font-display font-semibold", sort === v ? "bg-white shadow-card" : "text-ink-muted")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {offers === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-48 rounded-3xl" />
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        ) : sorted.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {sorted.map((o) => {
              const vsDiy = Math.round(((o.total - planned) / Math.max(1, planned)) * 100);
              return (
                <article key={o.id} className={cn("flex flex-col rounded-3xl bg-white p-4 shadow-card", o.id === pick?.id && "ring-2 ring-savanna-500")}>
                  <div className="flex flex-wrap gap-1.5">
                    {o.partner.sponsored && <span className="rounded-full bg-ochre-400 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink">Sponsored</span>}
                    {o.id === pick?.id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-savanna-500 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-white">
                        <Trophy className="h-3 w-3" /> Tembea pick
                      </span>
                    )}
                    {o.id === cheapest?.id && <span className="rounded-full bg-savanna-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-savanna-700">Lowest price</span>}
                    {o.id === topRated?.id && o.rating && <span className="rounded-full bg-dusk-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-dusk-500">Top rated</span>}
                    {o.partner.demo && <span className="rounded-full bg-sand-100 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink-muted">Sample listing</span>}
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold leading-snug">{o.title}</h3>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-muted">
                    {o.partner.name}
                    {o.rating != null && (
                      <>
                        · <Star className="h-3 w-3 fill-ochre-400 text-ochre-400" /> {o.rating.toFixed(1)} ({o.reviews})
                      </>
                    )}
                    · {o.days} days · {TIER_LABEL[o.tier as Tier] ?? o.tier}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {places.map((p) => (
                      <span key={p} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", o.covered.includes(p) ? "bg-savanna-50 text-savanna-700" : "bg-sand-50 text-ink-muted line-through")}>
                        {o.covered.includes(p) ? <Check className="h-3 w-3" /> : null} {PLACE_BY_ID[p]?.name}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                    {o.includes.slice(0, 4).map((x) => (
                      <li key={x} className="flex gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-savanna-600" /> {x}
                      </li>
                    ))}
                    {o.excludes.slice(0, 2).map((x) => (
                      <li key={x} className="flex gap-2 text-ink-muted">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {x}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                    <div>
                      <p className="font-display text-xl font-bold">{money(o.total, currency)}</p>
                      <p className="text-xs text-ink-muted">
                        {money(o.pricePerPerson, currency)} pp · covers {o.covered.length} of {places.length} stops
                        {o.coverage === 1 && <span className={vsDiy <= 0 ? " text-savanna-700" : ""}> · {vsDiy <= 0 ? `${-vsDiy}% under` : `${vsDiy}% over`} DIY</span>}
                      </p>
                    </div>
                    <a href={`/api/go?offer=${o.id}`} target="_blank" rel="noreferrer sponsored" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 font-display text-sm font-semibold text-white">
                      View package <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-muted">No partner packages cover these stops yet. Doing it yourself with the stays below works great.</p>
        )}
        {pick && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-savanna-50 p-3 text-sm text-savanna-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Why {pick.partner.name}?</b> It covers {pick.covered.length} of your {places.length} stops at {money(Math.round(pick.pricePerPerson / pick.days), currency)} per person per day
              {pick.rating ? `, rated ${pick.rating.toFixed(1)}` : ""}
              {pick.tier === trip.budget ? `, and it matches your ${TIER_LABEL[trip.budget].toLowerCase()} budget` : ""}. Sponsored listings never change this pick.
            </span>
          </p>
        )}
      </section>

      {/* ---------------- Stays ---------------- */}
      <section>
        <h2 className="text-xl font-bold">At each stop: stays, transport, guides and tours</h2>
        <p className="mb-3 text-sm text-ink-muted">Every stop by price level. Totals are for {nights} nights across the trip, {rooms} room{rooms > 1 ? "s" : ""}. Check live prices before you pay.</p>
        <div className="scrollbar-none -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {trip.stops.map((s) => (
            <button key={s.id} onClick={() => setStopId(s.id)} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 font-display text-sm font-semibold", s.id === stop?.id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white")}>
              <MapPin className="h-3.5 w-3.5" /> {PLACE_BY_ID[s.placeId].name} · {s.nights}n
            </button>
          ))}
        </div>
        {stop && (
          <div className="grid gap-3 md:grid-cols-3">
            {(["budget", "mid", "luxury"] as Tier[]).map((tier) => {
              const list = stays.filter((s) => s.tier === tier).sort((a, b) => a.perNight - b.perNight);
              const best = bestStay(tier);
              return (
                <div key={tier} className={cn("rounded-3xl p-3", tier === trip.budget ? "bg-savanna-50/70 ring-1 ring-savanna-200" : "bg-sand-50")}>
                  <p className="mb-2 flex items-center justify-between px-1 font-display text-sm font-bold">
                    {TIER_LABEL[tier]}
                    {tier === trip.budget && <span className="text-[11px] font-semibold text-savanna-700">Your budget</span>}
                  </p>
                  <div className="space-y-2">
                    {list.length ? (
                      list.map((st) => {
                        const chosen = stop.stayId ? stop.stayId === st.id : stop.stay === st.name;
                        return (
                          <div key={st.id} className={cn("overflow-hidden rounded-2xl bg-white shadow-card", chosen && "ring-2 ring-ink")}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={unsplash(st.image, 480, 200)} alt="" className="h-24 w-full object-cover" loading="lazy" />
                            <div className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {st.id === recommended?.id && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-savanna-500 px-2 py-0.5 font-display text-[10px] font-bold uppercase text-white">
                                    <BadgeCheck className="h-3 w-3" /> Best for you
                                  </span>
                                )}
                                {st.id === best?.id && st.id !== recommended?.id && <span className="rounded-full bg-savanna-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase text-savanna-700">Best value</span>}
                                {chosen && <span className="rounded-full bg-ink px-2 py-0.5 font-display text-[10px] font-bold uppercase text-white">In your plan</span>}
                              </div>
                              <p className="mt-1 font-display text-sm font-bold leading-snug">{st.name}</p>
                              <p className="text-xs text-ink-muted">
                                {"★".repeat(st.stars)} · {st.type} · {st.board}
                              </p>
                              <p className={cn("mt-1 text-xs", st.freeCancellation ? "text-savanna-700" : "text-ink-muted")}>{st.cancellation}</p>
                              <p className="mt-2 font-display font-bold">
                                {money(st.perNight * stop.nights * rooms, currency)} <span className="text-xs font-normal text-ink-muted">· {money(st.perNight, currency)}/night</span>
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {!chosen && (
                                  <button onClick={() => useStay(st)} className="inline-flex h-8 items-center rounded-full bg-savanna-500 px-3 font-display text-xs font-semibold text-white">
                                    Use this stay
                                  </button>
                                )}
                                <a href={bookingUrl(st.name, PLACE_BY_ID[stop.placeId].name)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">
                                  Live price <ExternalLink className="h-3 w-3" />
                                </a>
                                <a href={mapsUrl(st.name, PLACE_BY_ID[stop.placeId].name)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">
                                  Map
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-2xl bg-white p-3 text-xs text-ink-muted">No {TIER_LABEL[tier].toLowerCase()} stays listed here yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
          <BedDouble className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Rates are typical for the season and room type. &quot;Live price&quot; opens the property on Booking.com with today&apos;s availability.
        </p>
        {stop && (
          <div className="mt-5">
            <LocalServices placeId={stop.placeId} travelers={trip.travelers} nights={stop.nights} currency={currency} />
          </div>
        )}
      </section>

    </div>
  );
}

/** stars and free cancellation per shilling: the "best value" inside a price level */
function valueScore(s: Stay) {
  return (s.stars + (s.freeCancellation ? 1 : 0) + (s.breakfast ? 0.5 : 0)) / Math.sqrt(s.perNight);
}
