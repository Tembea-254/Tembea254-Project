/**
 * Tembea254 planning engine.
 * A deterministic Kenya-specific planner that turns a free-text description plus
 * preferences into a routed, day-by-day itinerary with costs and a packing list.
 * The /api/plan route can ask an LLM for a draft first; everything is then
 * normalised through this module so the UI always receives a valid Trip.
 */
import { FOOD_PER_DAY, PARK_FEES, PLACES, PLACE_BY_ID, type ActivitySeed, type Interest, type Place, type Tier } from "../data/places";
import { addDays, haversineKm, uid, unsplash } from "../utils";
import type { Day, ExpenseCategory, Item, Leg, PackItem, PlanRequest, Stop, Trip } from "./types";
import { transportOptions, type TransportMode } from "./transport";

/* ------------------------------------------------------------------ */
/* Prompt parsing                                                      */
/* ------------------------------------------------------------------ */

const INTEREST_WORDS: Record<Interest, string[]> = {
  wildlife: ["safari", "wildlife", "animals", "big five", "lion", "elephant", "game drive", "migration", "rhino"],
  beach: ["beach", "ocean", "sea", "snorkel", "dive", "coast", "island", "sand"],
  culture: ["culture", "history", "heritage", "swahili", "maasai", "museum", "local", "village"],
  adventure: ["hike", "hiking", "adventure", "cycle", "climb", "kitesurf", "trek", "balloon"],
  food: ["food", "eat", "cuisine", "nyama", "seafood", "restaurant"],
  city: ["city", "nightlife", "shopping", "urban"],
  relax: ["relax", "slow", "chill", "honeymoon", "romantic", "rest", "spa"],
};

export function parsePrompt(text: string) {
  const t = text.toLowerCase();
  const places = PLACES.filter((p) => p.aliases.some((a) => t.includes(a))).map((p) => p.id);
  const interests = (Object.keys(INTEREST_WORDS) as Interest[]).filter((k) => INTEREST_WORDS[k].some((w) => t.includes(w)));
  const daysMatch = t.match(/(\d{1,2})\s*(?:-|to)?\s*(day|days|night|nights)/);
  const weekMatch = t.match(/(\d|one|two|three)\s*weeks?/);
  const wordNum: Record<string, number> = { one: 1, two: 2, three: 3 };
  let days: number | undefined;
  if (daysMatch) days = parseInt(daysMatch[1], 10) + (daysMatch[2].startsWith("night") ? 1 : 0);
  else if (weekMatch) days = 7 * (wordNum[weekMatch[1]] ?? parseInt(weekMatch[1], 10));
  else if (/\b(a|one) week\b/.test(t)) days = 7;
  else if (/\bfortnight\b/.test(t)) days = 14;
  else if (t.includes("weekend")) days = 3;
  let budget: Tier | undefined;
  if (/(luxury|lux|high[- ]end|splurge|honeymoon)/.test(t)) budget = "luxury";
  else if (/(budget|cheap|backpack|affordable)/.test(t)) budget = "budget";
  else if (/(mid|moderate|comfortable)/.test(t)) budget = "mid";
  const group = /(family|kids|children)/.test(t)
    ? "family"
    : /(couple|partner|honeymoon|wife|husband|girlfriend|boyfriend)/.test(t)
      ? "couple"
      : /(friends|group|squad)/.test(t)
        ? "friends"
        : /(solo|alone|myself)/.test(t)
          ? "solo"
          : undefined;
  // "4 people", "six adults", "family of 5", "for 3 of us", "2 pax"
  const nums: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const countMatch =
    t.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(people|persons|adults|travell?ers|guests|pax|friends|of us)\b/) ||
    t.match(/\b(?:family|group|party) of (\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\b/);
  const travelers = countMatch ? Math.min(20, Math.max(1, nums[countMatch[1]] ?? parseInt(countMatch[1], 10))) : undefined;
  const groupOut = group ?? (travelers && travelers > 2 ? "friends" : travelers === 1 ? "solo" : undefined);
  return { places, interests, days, budget, group: groupOut, travelers } as const;
}

/* ------------------------------------------------------------------ */
/* Route building                                                      */
/* ------------------------------------------------------------------ */

const GROUPS: string[][] = [
  ["nairobi", "naivasha", "lake-nakuru", "maasai-mara", "amboseli", "mount-kenya", "samburu"],
  ["tsavo-east", "mombasa", "diani", "watamu", "lamu"],
];

function scorePlace(p: Place, interests: Interest[]) {
  if (!interests.length) return p.kind === "safari" ? 2 : 1;
  return interests.reduce((s, i) => s + (p.interests.includes(i) ? (p.interests[0] === i ? 2 : 1) : 0), 0);
}

export function chooseStops(req: PlanRequest, parsedPlaces: string[]): string[] {
  const nights = Math.max(1, req.days - 1);
  const explicit = Array.from(new Set([...req.places, ...parsedPlaces])).filter((id) => PLACE_BY_ID[id]);
  const picks: string[] = [];
  let left = nights;
  const take = (id: string, force = false) => {
    const p = PLACE_BY_ID[id];
    if (!p || picks.includes(id)) return;
    if (!force && left < p.minNights) return;
    picks.push(id);
    left -= Math.min(p.idealNights, Math.max(left, 0));
  };
  // 1. What the traveller explicitly asked for always comes first.
  explicit.forEach((id) => take(id, true));
  // 2. Fill the remaining nights with the best matches for their interests.
  const wantsBeach = req.interests.includes("beach") || req.interests.includes("relax");
  const wantsSafari = req.interests.includes("wildlife") || (!req.interests.length && !explicit.length);
  if (!explicit.length) {
    if (wantsSafari) take("maasai-mara");
    if (wantsBeach && nights >= 4) take("diani");
  }
  const ranked = [...PLACES].filter((p) => p.id !== "nairobi").sort((a, b) => scorePlace(b, req.interests) - scorePlace(a, req.interests));
  for (const p of ranked) {
    if (left < (explicit.length ? 4 : 2)) break;
    if (explicit.length && scorePlace(p, req.interests) < 1) continue;
    take(p.id);
  }
  if (!picks.length) picks.push("nairobi");
  // 3. International arrivals land at JKIA: start in Nairobi unless the route already begins at a gateway.
  const firstIsGateway = picks.some((id) => PLACE_BY_ID[id].gateway && PLACE_BY_ID[id].kind !== "safari");
  const coastOnly = picks.every((id) => GROUPS[1].includes(id));
  if (!picks.includes("nairobi") && nights >= 3 && !(coastOnly && firstIsGateway)) picks.unshift("nairobi");
  return trimToNights(picks, nights);
}

function trimToNights(ids: string[], nights: number) {
  const out: string[] = [];
  let left = nights;
  for (const id of ids) {
    if (left <= 0) break;
    out.push(id);
    left -= Math.min(PLACE_BY_ID[id].minNights, left);
  }
  return out;
}

/**
 * Order stops along Kenya's classic circuit: Nairobi → north (Mt Kenya, Samburu) → Rift Valley lakes →
 * Mara → Amboseli → Tsavo → coast (Mombasa, Diani, Watamu, Lamu). This avoids zig-zagging back and forth.
 */
const CIRCUIT = ["nairobi", "mount-kenya", "samburu", "lake-nakuru", "naivasha", "maasai-mara", "amboseli", "tsavo-east", "mombasa", "diani", "watamu", "lamu"];
export function orderStops(ids: string[]): string[] {
  return [...ids].sort((a, b) => CIRCUIT.indexOf(a) - CIRCUIT.indexOf(b));
}

export function allocateNights(ids: string[], totalNights: number, style: PlanRequest["style"]): number[] {
  const n = ids.map((id) => PLACE_BY_ID[id].minNights);
  let left = totalNights - n.reduce((a, b) => a + b, 0);
  // Relaxed travellers get extra nights first at beach/culture spots; packed ones spread evenly.
  const priority = [...ids.keys()].sort((a, b) => {
    const pa = PLACE_BY_ID[ids[a]];
    const pb = PLACE_BY_ID[ids[b]];
    const w = (p: Place) => (style === "relaxed" && (p.kind === "beach" || p.kind === "culture") ? 2 : 0) + (p.idealNights - p.minNights);
    return w(pb) - w(pa);
  });
  let guard = 0;
  while (left > 0 && guard++ < 200) {
    for (const i of priority) {
      if (left <= 0) break;
      const p = PLACE_BY_ID[ids[i]];
      const cap = p.id === "nairobi" ? 2 : style === "relaxed" ? p.idealNights + 3 : p.idealNights + 1;
      if (n[i] < cap || (guard > 20 && p.id !== "nairobi")) {
        n[i]++;
        left--;
      }
    }
  }
  while (left < 0) {
    const i = n.indexOf(Math.max(...n));
    if (n[i] <= 1) break;
    n[i]--;
    left++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Transport legs                                                      */
/* ------------------------------------------------------------------ */


export function estimateLeg(fromId: string, toId: string, mode?: TransportMode, travelers = 2): Leg {
  const opts = transportOptions(fromId, toId, travelers);
  const o = (mode && opts.find((x) => x.mode === mode)) || opts.find((x) => x.recommended) || opts[0];
  return { from: fromId, to: toId, mode: o.mode, km: o.km, minutes: o.minutes, cost: o.perPerson, label: o.label };
}

/* ------------------------------------------------------------------ */
/* Days                                                                */
/* ------------------------------------------------------------------ */

const PER_SLOT: Record<PlanRequest["style"], number> = { relaxed: 1, balanced: 2, packed: 3 };

function pickActivities(p: Place, interests: Interest[], used: Set<string>) {
  const sorted = [...p.activities].sort((a, b) => {
    const s = (x: ActivitySeed) => x.tags.filter((t) => interests.includes(t)).length - (used.has(x.title) ? 10 : 0);
    return s(b) - s(a);
  });
  return sorted;
}

function itemFromSeed(seed: ActivitySeed, travelers: number): Item {
  return {
    id: uid("i_"),
    time: seed.time,
    title: seed.title,
    type: "activity",
    minutes: seed.minutes,
    cost: seed.cost * travelers,
    notes: seed.note,
  };
}

function buildDays(req: PlanRequest, stops: Stop[], legs: Leg[]): Day[] {
  const days: Day[] = [];
  const used = new Set<string>();
  let dayIndex = 0;
  const perDay = PER_SLOT[req.style];
  const tier = req.budget;

  stops.forEach((stop, si) => {
    const p = PLACE_BY_ID[stop.placeId];
    const legIn = si > 0 ? legs[si - 1] : undefined;
    for (let n = 0; n < stop.nights; n++) {
      const items: Item[] = [];
      const date = addDays(req.startDate, dayIndex);
      const isArrival = n === 0;
      let title = p.name;
      if (dayIndex === 0) {
        items.push({ id: uid("i_"), time: "10:00", title: `Arrive in ${p.name}${p.id === "nairobi" ? " (JKIA)" : ""}`, type: "transport", cost: 0, notes: "Meet your driver-guide, SIM & cash at arrivals" });
        title = `Karibu Kenya — ${p.name}`;
      } else if (isArrival && legIn) {
        items.push({
          id: uid("i_"),
          time: legIn.mode === "flight" ? "08:30" : "07:30",
          title: `${legIn.label} → ${p.name}`,
          type: "transport",
          minutes: legIn.minutes,
          cost: legIn.cost * req.travelers,
          notes: `${legIn.km} km · approx. ${Math.round(legIn.minutes / 60)}h`,
        });
        title = `Travel to ${p.name}`;
      }
      if (isArrival) {
        items.push({ id: uid("i_"), time: "13:00", title: `Check in: ${stop.stay}`, type: "stay", cost: 0, notes: `${stop.nights} night${stop.nights > 1 ? "s" : ""}` });
      }
      const pool = pickActivities(p, req.interests, used);
      const slots: ("morning" | "afternoon" | "evening")[] =
        isArrival && (legIn || dayIndex === 0)
          ? ["afternoon", "evening"]
          : ["morning", "afternoon", "evening"];
      let added = 0;
      const max = isArrival ? Math.max(1, perDay - 1) : perDay;
      for (const slot of slots) {
        if (added >= max + 1) break;
        const seed = pool.find((s) => s.slot === slot && !used.has(s.title));
        if (seed && (added < max || slot === "evening")) {
          used.add(seed.title);
          items.push(itemFromSeed(seed, req.travelers));
          added++;
          if (!title.includes("·") && !isArrival && slot !== "evening") title = `${p.name} · ${seed.title.split(/[—:(&,]/)[0].trim()}`;
        }
      }
      items.push({ id: uid("i_"), time: "12:30", title: `Lunch — ${p.dining.lunch}`, type: "meal", cost: Math.round(FOOD_PER_DAY[tier] * 0.35) * req.travelers });
      const dinnerPlanned = items.some((i) => i.type === "activity" && /dinner|nyama|seafood/i.test(i.title));
      if (!dinnerPlanned) items.push({ id: uid("i_"), time: "19:30", title: `Dinner — ${p.dining.dinner}`, type: "meal", cost: Math.round(FOOD_PER_DAY[tier] * 0.5) * req.travelers });
      if (!items.some((i) => i.type === "activity")) {
        items.push({ id: uid("i_"), time: "15:00", title: "Free time to rest and explore", type: "note", cost: 0 });
      }
      items.sort((a, b) => a.time.localeCompare(b.time));
      days.push({ id: uid("d_"), date, placeId: p.id, title, items });
      dayIndex++;
    }
  });

  // Departure day
  const last = stops[stops.length - 1];
  const lastPlace = PLACE_BY_ID[last.placeId];
  const homeLeg = lastPlace.gateway ? undefined : estimateLeg(last.placeId, "nairobi", undefined, req.travelers);
  days.push({
    id: uid("d_"),
    date: addDays(req.startDate, dayIndex),
    placeId: lastPlace.gateway ? lastPlace.id : "nairobi",
    title: "Kwaheri — departure day",
    items: [
      { id: uid("i_"), time: "07:30", title: "Breakfast & check out", type: "meal", cost: 0 },
      ...(homeLeg
        ? [{ id: uid("i_"), time: "09:00", title: `${homeLeg.label} → Nairobi`, type: "transport" as const, minutes: homeLeg.minutes, cost: homeLeg.cost * req.travelers }]
        : []),
      { id: uid("i_"), time: homeLeg ? "16:00" : "11:00", title: `Transfer to ${lastPlace.gateway ? lastPlace.name : "JKIA"} airport`, type: "transport", cost: 3500 },
    ],
  });
  return days;
}

/* ------------------------------------------------------------------ */
/* Budget & packing                                                    */
/* ------------------------------------------------------------------ */

export function computePlanned(trip: Pick<Trip, "stops" | "days" | "travelers" | "budget">): Record<ExpenseCategory, number> {
  const rooms = Math.max(1, Math.ceil(trip.travelers / 2));
  const stay = trip.stops.reduce((s, st) => s + st.stayPerNight * st.nights * rooms, 0);
  let transport = 0;
  let activities = 0;
  let food = 0;
  for (const d of trip.days)
    for (const i of d.items) {
      if (i.type === "transport") transport += i.cost;
      else if (i.type === "meal") food += i.cost;
      else activities += i.cost;
    }
  const parks = trip.stops.reduce((s, st) => s + (PARK_FEES[st.placeId] ?? 0) * st.nights * trip.travelers, 0);
  return { stay, transport, activities, food, parks, other: Math.round((stay + transport) * 0.05) };
}

export function buildPacking(placeIds: string[], group: PlanRequest["group"]): PackItem[] {
  const kinds = new Set(placeIds.map((id) => PLACE_BY_ID[id]?.kind));
  const L: [string, string][] = [
    ["Passport (6+ months validity)", "Documents"],
    ["Kenya eTA approval (printed + phone)", "Documents"],
    ["Travel insurance details", "Documents"],
    ["Yellow fever certificate (if required for your route)", "Documents"],
    ["Cash (KES) + card · set up M-Pesa", "Money"],
    ["Universal adapter (UK type G)", "Tech"],
    ["Power bank", "Tech"],
    ["Local SIM / eSIM (Safaricom)", "Tech"],
    ["Sunscreen SPF 50", "Health"],
    ["Insect repellent (DEET)", "Health"],
    ["Personal medication + malaria advice from your doctor", "Health"],
    ["Reusable water bottle", "Essentials"],
    ["Sunglasses & hat", "Clothing"],
  ];
  if (kinds.has("safari") || kinds.has("nature")) {
    L.push(
      ["Neutral-colour clothes (khaki, olive, beige)", "Clothing"],
      ["Warm fleece for dawn game drives", "Clothing"],
      ["Binoculars", "Safari"],
      ["Camera + zoom lens & spare cards", "Safari"],
      ["Soft duffel bag (bush-flight limit ~15 kg)", "Safari"],
      ["Dust cover / buff", "Safari"],
    );
  }
  if (kinds.has("beach")) {
    L.push(["Swimwear", "Beach"], ["Reef-safe sunscreen", "Beach"], ["Water shoes for the reef", "Beach"], ["Rash vest for snorkelling", "Beach"]);
  }
  if (kinds.has("culture") || kinds.has("city")) {
    L.push(["Modest clothing for Old Town & mosques (shoulders/knees covered)", "Clothing"], ["Comfortable walking sandals", "Clothing"]);
  }
  if (group === "family") L.push(["Kids' snacks & entertainment for drives", "Family"], ["Child sun hats & after-sun", "Family"]);
  return L.map(([label, category]) => ({ id: uid("p_"), label, category, packed: false }));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function normaliseRequest(req: PlanRequest): PlanRequest & { parsedPlaces: string[] } {
  const parsed = parsePrompt(req.prompt || "");
  const touched = new Set(req.touched ?? []);
  const pick = <T,>(field: "days" | "budget" | "group", manual: T | undefined, fromPrompt: T | undefined, fallback: T): T =>
    touched.has(field) ? (manual ?? fromPrompt ?? fallback) : (fromPrompt ?? manual ?? fallback);
  const group = pick("group", req.group, parsed.group, "couple");
  return {
    ...req,
    days: Math.min(21, Math.max(2, pick("days", req.days || undefined, parsed.days, 7))),
    budget: pick("budget", req.budget, parsed.budget, "mid"),
    group,
    travelers: touched.has("travelers") ? req.travelers : parsed.travelers ?? (group === "solo" ? 1 : group === "family" && req.travelers < 3 ? 4 : req.travelers),
    interests: Array.from(new Set([...(req.interests || []), ...parsed.interests])),
    parsedPlaces: parsed.places,
  };
}

export function titleFor(stops: Stop[], days: number) {
  const names = stops.filter((s) => stops.length < 3 || s.placeId !== "nairobi").map((s) => PLACE_BY_ID[s.placeId].name.replace(/^(Lake|Mount) /, "").split(/ [&·]/)[0]);
  const hasBeach = stops.some((s) => PLACE_BY_ID[s.placeId].kind === "beach");
  const hasSafari = stops.some((s) => ["safari", "nature"].includes(PLACE_BY_ID[s.placeId].kind));
  const coastal = stops.every((s) => GROUPS[1].includes(s.placeId));
  const flavour = hasSafari && hasBeach ? "Bush & Beach" : hasSafari ? "Safari" : hasBeach || coastal ? "Coast" : "Kenya";
  return `${days}-day ${flavour}: ${names.slice(0, 3).join(" · ")}${names.length > 3 ? " +" + (names.length - 3) : ""}`;
}

export function makeStops(ids: string[], nights: number[], tier: Tier): Stop[] {
  return ids.map((id, i) => ({
    id: uid("s_"),
    placeId: id,
    nights: nights[i],
    stay: PLACE_BY_ID[id].stays[tier].name,
    stayPerNight: PLACE_BY_ID[id].stays[tier].perNight,
  }));
}

export function legsFor(stops: Stop[], travelers = 2): Leg[] {
  return stops.slice(1).map((s, i) => estimateLeg(stops[i].placeId, s.placeId, s.arriveBy, travelers));
}

export function generateTrip(input: PlanRequest): Trip {
  const req = normaliseRequest(input);
  const totalNights = req.days - 1;
  const ids = orderStops(chooseStops(req, req.parsedPlaces));
  const nights = allocateNights(ids, totalNights, req.style);
  const stops = makeStops(ids, nights, req.budget);
  const legs = legsFor(stops, req.travelers);
  const days = buildDays(req, stops, legs);
  return finaliseTrip(req, stops, days, "engine");
}

export function finaliseTrip(req: PlanRequest, stops: Stop[], days: Day[], source: Trip["source"], title?: string): Trip {
  const base = { stops, days, travelers: req.travelers, budget: req.budget };
  const planned = computePlanned(base);
  const total = Object.values(planned).reduce((a, b) => a + b, 0);
  const names = Array.from({ length: req.travelers }, (_, i) => (i === 0 ? "You" : `Traveller ${i + 1}`));
  const tripDays = days.length;
  return {
    id: uid("t_"),
    title: title || titleFor(stops, tripDays),
    summary: req.prompt?.trim() || `${tripDays} days · ${stops.length} stops`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    startDate: req.startDate,
    travelers: req.travelers,
    travelerNames: names,
    group: req.group,
    style: req.style,
    budget: req.budget,
    interests: req.interests,
    stops,
    days,
    planned,
    budgetLimit: Math.ceil((total * 1.1) / 5000) * 5000,
    expenses: [],
    packing: buildPacking(stops.map((s) => s.placeId), req.group),
    notes: "",
    source,
    cover: unsplash(PLACE_BY_ID[stops.find((s) => PLACE_BY_ID[s.placeId].kind !== "city")?.placeId ?? stops[0].placeId].image, 1600),
  };
}

/** Rebuild days after the route (stops / nights / order) has been edited. */
export function rebuildFromStops(trip: Trip): Trip {
  const req: PlanRequest = {
    prompt: trip.summary,
    days: trip.stops.reduce((s, st) => s + st.nights, 0) + 1,
    startDate: trip.startDate,
    travelers: trip.travelers,
    group: trip.group,
    style: trip.style,
    budget: trip.budget,
    interests: trip.interests,
    places: [],
  };
  const legs = legsFor(trip.stops, trip.travelers);
  const days = buildDays(req, trip.stops, legs);
  const next = { ...trip, days, updatedAt: Date.now() };
  return { ...next, planned: computePlanned(next) };
}
