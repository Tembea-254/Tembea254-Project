import type { Tier } from "../data/places";
import type { OfferView } from "../repo/partners";
import type { Trip } from "./types";

export type ScoredOffer = OfferView & { covered: string[]; coverage: number; total: number; score: number };

const TIERS: Tier[] = ["budget", "mid", "luxury"];

/**
 * Scores partner packages for a trip the same way for everyone: how many of the trip's stops they
 * cover (40%), price per day against the cheapest (25%), how close they are to the traveller's
 * budget level (20%) and rating (15%). Sponsorship is deliberately not an input.
 */
export function rankPackages(offers: OfferView[], trip: Pick<Trip, "stops" | "travelers" | "budget">): ScoredOffer[] {
  const places = [...new Set(trip.stops.map((s) => s.placeId))];
  const list: ScoredOffer[] = offers
    .filter((o) => o.kind === "operator")
    .map((o) => {
      const covered = o.places.filter((p) => places.includes(p));
      return { ...o, covered, coverage: covered.length / Math.max(1, places.length), total: o.pricePerPerson * trip.travelers, score: 0 };
    })
    .filter((o) => o.covered.length > 0);
  if (!list.length) return [];
  const minDay = Math.min(...list.map((o) => o.pricePerPerson / o.days));
  for (const o of list) {
    const value = minDay / (o.pricePerPerson / o.days);
    const rating = (o.rating ?? 4) / 5;
    const gap = Math.abs(TIERS.indexOf(o.tier as Tier) - TIERS.indexOf(trip.budget));
    const tierFit = gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
    o.score = o.coverage * 0.4 + value * 0.25 + tierFit * 0.2 + rating * 0.15;
  }
  return list.sort((a, b) => b.score - a.score);
}

export const bookingUrl = (name: string, place: string) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${name}, ${place}, Kenya`)}`;
export const mapsUrl = (name: string, place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${place}, Kenya`)}`;
