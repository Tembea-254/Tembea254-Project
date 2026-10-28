/**
 * Multi-modal transport routing for Kenya.
 * Given two planner places, returns every sensible way to travel between them —
 * self-drive, private van, flight, SGR train, coach bus, ferry/boat — with time and indicative cost,
 * based on distance and real geography (airstrips, SGR stations, the Likoni ferry, Lamu boats…).
 * All prices are indicative 2026 planning figures, not quotes.
 */
import { PLACE_BY_ID } from "../data/places";
import { haversineKm } from "../utils";

export type TransportMode = "drive" | "van" | "flight" | "train" | "bus" | "ferry";

export interface TransportOption {
  mode: TransportMode;
  label: string;
  /** door-to-door estimate in minutes */
  minutes: number;
  km: number;
  /** total for the whole group, KES */
  total: number;
  perPerson: number;
  /** step-by-step, e.g. ["SGR Nairobi → Mombasa", "Likoni ferry", "Taxi to Diani"] */
  steps: string[];
  notes: string[];
  recommended?: boolean;
}

/* Hubs ------------------------------------------------------------- */
const AIRPORT: Record<string, string> = {
  nairobi: "JKIA / Wilson",
  "maasai-mara": "Mara airstrips",
  amboseli: "Amboseli airstrip",
  samburu: "Kalama / Buffalo Springs airstrip",
  "mount-kenya": "Nanyuki airstrip",
  mombasa: "Moi International (Mombasa)",
  diani: "Ukunda airstrip (Diani)",
  watamu: "Malindi airport",
  lamu: "Manda airport (Lamu)",
};
const BUSH_STRIP = new Set(["maasai-mara", "amboseli", "samburu"]);
const RAIL: Record<string, { station: string; fromNairobiKm: number }> = {
  nairobi: { station: "Nairobi Terminus", fromNairobiKm: 0 },
  "tsavo-east": { station: "Voi", fromNairobiKm: 320 },
  mombasa: { station: "Mombasa Terminus (Miritini)", fromNairobiKm: 472 },
  diani: { station: "Mombasa Terminus (Miritini)", fromNairobiKm: 472 },
};
const BUS_TOWN: Record<string, string> = {
  nairobi: "Nairobi",
  mombasa: "Mombasa",
  diani: "Ukunda",
  watamu: "Watamu / Malindi",
  lamu: "Mokowe jetty",
  "lake-nakuru": "Nakuru",
  naivasha: "Naivasha",
  "mount-kenya": "Nanyuki",
  "tsavo-east": "Voi",
};
const PARKS = new Set(["maasai-mara", "amboseli", "samburu", "tsavo-east", "lake-nakuru"]);
const NORTH_COAST = new Set(["mombasa", "watamu", "lamu"]);

const round = (n: number) => Math.round(n / 50) * 50;

export function transportOptions(fromId: string, toId: string, travelers = 2): TransportOption[] {
  const a = PLACE_BY_ID[fromId];
  const b = PLACE_BY_ID[toId];
  if (!a || !b) return [];
  const straight = haversineKm(a.coords, b.coords);
  const roadKm = Math.round(straight * 1.3);
  const parkLeg = PARKS.has(fromId) || PARKS.has(toId);
  const roadMinutes = Math.round((roadKm / (parkLeg ? 45 : roadKm > 300 ? 68 : 55)) * 60 + 20);
  const toLamu = toId === "lamu" || fromId === "lamu";
  const dianiOther = fromId === "diani" ? toId : toId === "diani" ? fromId : null;
  const crossesLikoni = !!dianiOther && (NORTH_COAST.has(dianiOther) || dianiOther === "tsavo-east" || dianiOther === "nairobi");
  const opts: TransportOption[] = [];
  const lamuBoat = toLamu ? ["Boat across the Lamu channel (~20–30 min)"] : [];

  // Self-drive (car hire); fuel only — car hire is extra
  {
    const cars = Math.ceil(travelers / 4);
    const fuel = round(roadKm * 16 * cars);
    opts.push({
      mode: "drive",
      label: crossesLikoni ? "Self-drive via Dongo Kundu bypass" : "Self-drive",
      minutes: roadMinutes + (toLamu ? 40 : 0),
      km: roadKm,
      total: fuel + (toLamu ? 300 * travelers : 0),
      perPerson: round((fuel + (toLamu ? 300 * travelers : 0)) / travelers),
      steps: [`Drive ${a.name} → ${toLamu ? "Mokowe jetty" : b.name} (~${roadKm} km)`, ...lamuBoat],
      notes: [
        "Fuel estimate only — add car hire (from ~KES 6,000/day)",
        ...(parkLeg ? ["Park roads are slow and rough; a 4x4 is best in the rains"] : []),
        ...(toLamu ? ["Cars stay at Mokowe — Lamu town is car-free"] : []),
        ...(dianiOther === "watamu" || fromId === "watamu" || toId === "watamu" ? ["No ferry needed north of Mombasa — the Mtwapa and Kilifi bridges carry the road"] : []),
      ],
    });
  }

  // Private transfer / safari van
  {
    const vans = Math.ceil(travelers / 6);
    const total = round((4000 + roadKm * 55) * vans + (toLamu ? 300 * travelers : 0));
    opts.push({
      mode: "van",
      label: parkLeg ? "Private safari van (pop-up roof)" : "Private transfer",
      minutes: roadMinutes + (toLamu ? 40 : 0),
      km: roadKm,
      total,
      perPerson: round(total / travelers),
      steps: [`Driver-guide picks you up in ${a.name}`, `Drive to ${toLamu ? "Mokowe jetty" : b.name}`, ...lamuBoat],
      notes: [parkLeg ? "Game drive on the way in — the driver doubles as your guide" : "Door to door, luggage included"],
    });
  }

  // Coach bus between towns
  if (BUS_TOWN[fromId] && BUS_TOWN[toId]) {
    const pp = round(300 + roadKm * 3.5 + (toLamu ? 300 : 0));
    opts.push({
      mode: "bus",
      label: "Coach bus",
      minutes: Math.round(roadMinutes * 1.25 + 30 + (toLamu ? 40 : 0)),
      km: roadKm,
      total: pp * travelers,
      perPerson: pp,
      steps: [`Coach from ${BUS_TOWN[fromId]} to ${BUS_TOWN[toId]}`, ...lamuBoat, ...(toId === "diani" && fromId !== "mombasa" ? ["Matatu or taxi to your hotel"] : [])],
      notes: ["Cheapest option; book a seat a day ahead in holidays", ...(crossesLikoni ? ["Most south-coast coaches cross on the Likoni ferry"] : [])],
    });
  }

  // SGR train (Madaraka Express)
  const ra = RAIL[fromId];
  const rb = RAIL[toId];
  if (ra && rb && ra.station !== rb.station) {
    const railKm = Math.abs(rb.fromNairobiKm - ra.fromNairobiKm);
    const share = railKm / 472;
    const economy = round(Math.max(300, 1500 * share));
    const first = round(Math.max(1000, 4500 * share));
    const lastMile = toId === "diani" || fromId === "diani";
    const pp = economy + (lastMile ? 1200 : 0);
    opts.push({
      mode: "train",
      label: "SGR — Madaraka Express",
      minutes: Math.round(railKm * 0.62 + 45 + (lastMile ? 90 : 0)),
      km: railKm,
      total: pp * travelers,
      perPerson: pp,
      steps: [`SGR ${ra.station} → ${rb.station}`, ...(lastMile ? ["Taxi via the Dongo Kundu bypass or the Likoni ferry to Diani (~1h–1h30)"] : [])],
      notes: [`Economy from ~${economy.toLocaleString()} KES, first class ~${first.toLocaleString()} KES`, "Arrive an hour early for security checks; pay with M-Pesa"],
    });
  }

  // Likoni ferry route for the south coast
  if (crossesLikoni && dianiOther !== "nairobi") {
    const cars = Math.ceil(travelers / 4);
    const total = round(roadKm * 16 * cars + 200 * cars);
    opts.push({
      mode: "ferry",
      label: "Drive + Likoni ferry",
      minutes: Math.max(45, roadMinutes - 10) + 30,
      km: roadKm,
      total,
      perPerson: round(total / travelers),
      steps: [`Drive to the Likoni crossing`, "Likoni ferry across the Kilindini channel (queues vary, ~15–45 min)", `Continue to ${b.name}`],
      notes: ["Foot passengers cross free; vehicles pay a small fee", "Shortest route from Mombasa island; the bypass avoids queues at peak times"],
    });
  }

  // Flights (scheduled + bush airstrips)
  if (AIRPORT[fromId] && AIRPORT[toId] && straight > 120) {
    const bush = BUSH_STRIP.has(fromId) || BUSH_STRIP.has(toId);
    const pp = round((8000 + straight * 14) * (bush ? 1.9 : 1));
    opts.push({
      mode: "flight",
      label: bush ? "Light-aircraft safari flight" : "Domestic flight",
      minutes: Math.round(40 + straight / 6.5 + 90),
      km: Math.round(straight),
      total: pp * travelers + (toLamu ? 300 * travelers : 0),
      perPerson: pp + (toLamu ? 300 : 0),
      steps: [`Fly ${AIRPORT[fromId]} → ${AIRPORT[toId]}`, ...lamuBoat, ...(bush ? ["Lodge vehicle meets you at the airstrip"] : [])],
      notes: [bush ? "Soft bags only, usually ~15 kg per person" : "Includes ~1h30 for check-in and transfers", ...(bush ? ["Fastest way into the parks — no bumpy roads"] : [])],
    });
  }

  // Lamu: the ferry/boat is the only way onto the island
  if (toLamu && !opts.some((o) => o.mode === "ferry")) {
    // nothing extra — every option above already includes the boat
  }

  // Recommended: fastest reasonable for long legs, cheapest comfortable for short ones
  const pick =
    (toLamu && opts.find((o) => o.mode === "flight")) ||
    ((fromId === "nairobi" || toId === "nairobi") && opts.find((o) => o.mode === "train")) ||
    (roadKm > 420 && opts.find((o) => o.mode === "flight")) ||
    (parkLeg && opts.find((o) => o.mode === "van")) ||
    opts.find((o) => o.mode === "van") ||
    opts[0];
  if (pick) pick.recommended = true;
  return opts.sort((x, y) => Number(!!y.recommended) - Number(!!x.recommended) || x.minutes - y.minutes);
}

export const MODE_LABEL: Record<TransportMode, string> = {
  drive: "Drive",
  van: "Private van",
  flight: "Flight",
  train: "Train",
  bus: "Bus",
  ferry: "Ferry",
};
