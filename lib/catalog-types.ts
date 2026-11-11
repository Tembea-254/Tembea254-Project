/**
 * One shape for everything a traveller can compare and book in the planner, whatever it comes from:
 * Tembea254 providers (guides, drivers), B2B partners (operators, lodges, car hire), affiliate platforms
 * (Viator, GetYourGuide) and offers our AI found on operators' sites. Safe to import in the browser.
 */

export type CatalogKind = "package" | "stay" | "transport" | "guide" | "tour";
export type CatalogSource = "tembea" | "partner" | "viator" | "getyourguide" | "web" | "hotel";

export type BookMode =
  /** Tembea254 request form, sent to the partner with a TB reference */
  | { mode: "request"; offerId: string; external?: string }
  /** hire a Tembea254 provider (request + optional M-Pesa deposit) */
  | { mode: "hire"; providerId: string }
  /** book on the provider's own site through a tracked referral link */
  | { mode: "external"; go: string };

export interface CatalogItem {
  id: string;
  source: CatalogSource;
  kind: CatalogKind;
  title: string;
  provider: string;
  places: string[];
  /** price in KES for one `unit` (when known) */
  price?: number;
  /** price as the provider shows it, e.g. "USD 85" */
  priceText?: string;
  unit: string;
  days?: number;
  durationText?: string;
  tier?: string;
  includes: string[];
  excludes: string[];
  rating?: number;
  reviews?: number;
  cancellation?: string;
  image?: string;
  languages?: string[];
  sponsored?: boolean;
  demo?: boolean;
  book: BookMode;
}

export const KIND_LABEL: Record<CatalogKind, string> = { package: "Packages", stay: "Stays", transport: "Vehicles & transfers", guide: "Guides", tour: "Day trips & tours" };

export const SOURCE_LABEL: Record<CatalogSource, string> = {
  tembea: "Tembea254 provider",
  partner: "Tembea254 partner",
  viator: "Viator",
  getyourguide: "GetYourGuide",
  web: "Found online",
  hotel: "Hotel",
};

export const UNIT_TEXT: Record<string, string> = {
  person: "per person",
  group: "per group",
  package: "per package",
  "vehicle/day": "per vehicle / day",
  day: "per day",
  "half day": "per half day",
  hour: "per hour",
  night: "per room / night",
  session: "per session",
  event: "per event",
  transfer: "per transfer",
};

/** What one item costs a group: units like per day or per night are multiplied by the days/nights asked for. */
export function groupPrice(item: Pick<CatalogItem, "price" | "unit">, people: number, quantity = 1) {
  if (!item.price) return undefined;
  const q = Math.max(1, quantity);
  switch (item.unit) {
    case "person":
      return item.price * people;
    case "night":
      return item.price * q * Math.max(1, Math.ceil(people / 2));
    case "vehicle/day":
      return item.price * q * Math.max(1, Math.ceil(people / 6));
    case "day":
    case "half day":
    case "hour":
    case "session":
      return item.price * q;
    default:
      return item.price;
  }
}

/** sensible default quantity for an item at a stop with this many nights */
export function defaultQuantity(item: Pick<CatalogItem, "unit">, nights: number) {
  if (item.unit === "night" || item.unit === "vehicle/day") return Math.max(1, nights);
  if (item.unit === "hour") return 4;
  return 1;
}
