import { defaultQuantity, groupPrice, KIND_LABEL, UNIT_TEXT, type CatalogItem } from "../catalog-types";
import { PLACE_BY_ID } from "../data/places";
import { addDays, uid } from "../utils";
import type { Day, Item, Pick, Stop, Trip } from "./types";

/**
 * Putting a Compare & book choice into the plan.
 *  - stay:       becomes that stop's stay
 *  - transport, guide, tour: an item on a day at that stop, priced for the group
 *  - package:    takes over its stops and days (the rest of the trip is rebuilt around it), and the
 *                package price replaces the stays, meals, activities and park fees it covers
 * Picks are stored on the trip and re-applied every time the days are rebuilt.
 */

const START: Record<string, string> = { transport: "07:30", guide: "08:00", tour: "09:00" };

export function pickFrom(item: CatalogItem, trip: Trip, placeId: string, opts: { quantity?: number; date?: string } = {}): Pick {
  const stop = trip.stops.find((s) => s.placeId === placeId);
  const quantity = opts.quantity ?? defaultQuantity(item, stop?.nights ?? 1);
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    provider: item.provider,
    placeId,
    places: item.kind === "package" ? (item.places.length ? item.places : [placeId]) : undefined,
    date: opts.date,
    quantity,
    unit: item.unit,
    cost: groupPrice(item, trip.travelers, quantity) ?? 0,
    days: item.days,
  };
}

/** Adds or replaces a pick. Returns the new stops (packages and stays change them) and picks. */
export function applyPick(trip: Trip, pick: Pick, stayPerNight?: number): { stops: Stop[]; picks: Pick[] } {
  let picks = [...(trip.picks ?? []).filter((p) => p.id !== pick.id && !(pick.kind === "stay" && p.kind === "stay" && p.placeId === pick.placeId))];
  let stops = trip.stops;
  if (pick.kind === "stay") {
    stops = stops.map((s) => (s.placeId === pick.placeId ? { ...s, stay: pick.title, stayPerNight: stayPerNight ?? s.stayPerNight, stayId: pick.id.replace(/^stay:/, "") } : s));
  }
  if (pick.kind === "package") {
    // one package at a time per stop: drop older packages that overlap
    picks = picks.filter((p) => !(p.kind === "package" && p.places?.some((x) => pick.places?.includes(x))));
    stops = packageStops(trip.stops, pick);
  }
  picks.push(pick);
  return { stops, picks };
}

export function removePick(trip: Trip, id: string): { stops: Stop[]; picks: Pick[] } {
  const gone = (trip.picks ?? []).find((p) => p.id === id);
  const picks = (trip.picks ?? []).filter((p) => p.id !== id);
  const stops = gone?.kind === "package" ? trip.stops.map((s) => (s.includedIn === gone.title ? { ...s, includedIn: undefined, stay: PLACE_BY_ID[s.placeId].stays.mid.name, stayPerNight: PLACE_BY_ID[s.placeId].stays.mid.perNight, stayId: undefined } : s)) : trip.stops;
  return { stops, picks };
}

/** The package's stops sit together where the first of them was; nights follow the package length. */
function packageStops(stops: Stop[], pick: Pick): Stop[] {
  const covered = (pick.places ?? []).filter((p) => PLACE_BY_ID[p]);
  if (!covered.length) return stops;
  const nights = Math.max(covered.length, (pick.days ?? covered.length + 1) - 1);
  const ideal = covered.map((p) => PLACE_BY_ID[p].idealNights || 1);
  const sum = ideal.reduce((a, b) => a + b, 0);
  const split = ideal.map((n) => Math.max(1, Math.floor((n / sum) * nights)));
  for (let i = 0; split.reduce((a, b) => a + b, 0) < nights; i = (i + 1) % split.length) split[i]++;
  const block: Stop[] = covered.map((placeId, i) => {
    const prev = stops.find((s) => s.placeId === placeId);
    return { id: prev?.id ?? uid("s_"), placeId, nights: split[i], stay: `Included in package (${pick.provider})`, stayPerNight: 0, includedIn: pick.title, arriveBy: prev?.arriveBy };
  });
  const firstIdx = stops.findIndex((s) => covered.includes(s.placeId));
  const rest = stops.filter((s) => !covered.includes(s.placeId));
  const at = firstIdx < 0 ? rest.length : stops.slice(0, firstIdx).filter((s) => !covered.includes(s.placeId)).length;
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

/** Re-applies picks to freshly built days (called after every rebuild). */
export function materializePicks(trip: Trip): Trip {
  if (!trip.picks?.length) return trip;
  const days: Day[] = trip.days.map((d) => ({ ...d, items: [...d.items] }));
  for (const p of trip.picks) {
    if (p.kind === "stay") continue;
    if (p.kind === "package") {
      const covered = new Set(p.places ?? [p.placeId]);
      const block = days.filter((d) => covered.has(d.placeId) && trip.stops.some((s) => s.placeId === d.placeId && s.includedIn === p.title));
      block.forEach((d, i) => {
        d.items = d.items.map((it) => (it.type === "meal" || it.type === "activity" || (it.type === "stay" && i === 0) ? { ...it, cost: 0, notes: [it.notes, "Included in your package"].filter(Boolean).join(" · ") } : it));
        if (i === 0)
          d.items.unshift({ id: uid("i_"), time: "06:00", title: `Package: ${p.title} (${p.provider})`, type: "note", cost: p.cost, notes: `Covers ${block.length} days${p.ref ? ` · ref ${p.ref}` : ""}. Stays, meals, game drives and park fees as listed by the operator.` });
      });
      continue;
    }
    const day = (p.date && days.find((d) => d.date === p.date)) || days.find((d, i) => d.placeId === p.placeId && i > 0 && !d.items.some((x) => x.type === "transport")) || days.find((d) => d.placeId === p.placeId);
    if (!day) continue;
    const item: Item = {
      id: uid("i_"),
      time: START[p.kind] ?? "09:00",
      title: `${KIND_LABEL[p.kind].replace(/s$/, "").replace(/ &.*/, "")}: ${p.title} (${p.provider})`,
      type: p.kind === "transport" ? "transport" : "activity",
      cost: p.cost,
      notes: `${p.quantity > 1 ? `${p.quantity} × ` : ""}${UNIT_TEXT[p.unit] ?? p.unit}${p.ref ? ` · ref ${p.ref}` : ""}`,
    };
    day.items = [...day.items, item].sort((a, b) => a.time.localeCompare(b.time));
  }
  return { ...trip, days };
}

/** first date the traveller is at a place */
export function firstDateAt(trip: Trip, placeId: string) {
  const i = trip.days.findIndex((d) => d.placeId === placeId);
  return i >= 0 ? trip.days[i].date : addDays(trip.startDate, 0);
}
