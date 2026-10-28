import { IMG } from "./images";
import type { Tier } from "./places";

export type StayType = "Tented camp" | "Safari lodge" | "Beach resort" | "Boutique hotel" | "City hotel" | "Guesthouse" | "Villa" | "Budget camp" | "Hostel";
export type Board = "Room only" | "Bed & breakfast" | "Half board" | "Full board" | "All-inclusive" | "Full board + game drives";

export interface Stay {
  id: string;
  placeId: string;
  name: string;
  type: StayType;
  /** hotel class (1–5 stars) — not a guest review score */
  stars: number;
  tier: Tier;
  /** indicative KES per room per night (2 sharing) */
  perNight: number;
  board: Board;
  breakfast: boolean;
  cancellation: string;
  freeCancellation: boolean;
  area: string;
  features: string[];
  image: string;
}

/**
 * Indicative accommodation catalogue for planning. Rates, board basis and cancellation terms are
 * typical for each property type and season and MUST be confirmed with the property or a booking
 * partner (Booking.com / Expedia affiliate APIs can replace this file with live data).
 */
const S = (s: Omit<Stay, "breakfast" | "freeCancellation"> & { freeCancellation?: boolean }): Stay => ({
  ...s,
  breakfast: s.board !== "Room only",
  freeCancellation: s.freeCancellation ?? /free/i.test(s.cancellation),
});

export const STAYS: Stay[] = [
  // Maasai Mara
  S({ id: "mara-explorers", placeId: "maasai-mara", name: "Mara Explorers Camp", type: "Budget camp", stars: 2, tier: "budget", perNight: 14000, board: "Full board", cancellation: "Free cancellation up to 14 days before", area: "Talek, near the reserve gate", features: ["Tents with en-suite", "Campfire", "Game drives bookable"], image: IMG.maraSunset }),
  S({ id: "mara-sopa", placeId: "maasai-mara", name: "Mara Sopa Lodge", type: "Safari lodge", stars: 4, tier: "mid", perNight: 32000, board: "Full board", cancellation: "Free cancellation up to 30 days before", area: "Oloolaimutia, eastern Mara", features: ["Pool", "Wi-Fi in lobby", "Escarpment views", "Game drives bookable"], image: IMG.maraMigration }),
  S({ id: "mara-ashnil", placeId: "maasai-mara", name: "Ashnil Mara Camp", type: "Tented camp", stars: 4, tier: "mid", perNight: 42000, board: "Full board + game drives", cancellation: "50% refundable up to 30 days before", area: "On the Mara River", features: ["River-view tents", "Pool", "Game drives included", "Migration crossings nearby"], image: IMG.maraLion }),
  S({ id: "mara-kichwa", placeId: "maasai-mara", name: "&Beyond Kichwa Tembo", type: "Tented camp", stars: 5, tier: "luxury", perNight: 150000, board: "All-inclusive", cancellation: "Non-refundable within 60 days", area: "Western Mara, Oloololo escarpment", features: ["Game drives & bush walks", "Pool", "Spa", "Drinks included"], image: IMG.maraBalloon }),
  S({ id: "mara-angama", placeId: "maasai-mara", name: "Angama Mara", type: "Safari lodge", stars: 5, tier: "luxury", perNight: 210000, board: "All-inclusive", cancellation: "Non-refundable within 60 days", area: "Oloololo escarpment rim", features: ["Escarpment views", "Infinity pool", "Photo studio", "Balloon add-on"], image: IMG.maraSunset }),
  // Amboseli
  S({ id: "amb-kibo", placeId: "amboseli", name: "Kibo Safari Camp", type: "Budget camp", stars: 3, tier: "budget", perNight: 12000, board: "Full board", cancellation: "Free cancellation up to 14 days before", area: "Kimana gate", features: ["Pool", "Kilimanjaro views", "Maasai cultural visits"], image: IMG.amboseliPlain }),
  S({ id: "amb-oltukai", placeId: "amboseli", name: "Ol Tukai Lodge", type: "Safari lodge", stars: 4, tier: "mid", perNight: 30000, board: "Full board", cancellation: "Free cancellation up to 30 days before", area: "Inside the park, swamp side", features: ["Inside the park", "Pool", "Kilimanjaro views"], image: IMG.amboseliHerd }),
  S({ id: "amb-tortilis", placeId: "amboseli", name: "Tortilis Camp", type: "Tented camp", stars: 5, tier: "luxury", perNight: 120000, board: "Full board + game drives", cancellation: "Non-refundable within 45 days", area: "Private conservancy, Kitirua", features: ["Private conservancy", "Walking safaris", "Pool", "Kilimanjaro views"], image: IMG.amboseliKili }),
  // Tsavo
  S({ id: "tsavo-red", placeId: "tsavo-east", name: "Red Elephant Safari Lodge", type: "Safari lodge", stars: 3, tier: "budget", perNight: 11000, board: "Half board", cancellation: "Free cancellation up to 7 days before", area: "Near Voi gate", features: ["Waterhole", "Pool", "Easy SGR access (Voi)"], image: IMG.tsavoElephants }),
  S({ id: "tsavo-voi", placeId: "tsavo-east", name: "Voi Safari Lodge", type: "Safari lodge", stars: 4, tier: "mid", perNight: 22000, board: "Full board", cancellation: "Free cancellation up to 21 days before", area: "Inside the park, hillside", features: ["Inside the park", "Waterhole hide", "Pool"], image: IMG.tsavoElephant2 }),
  S({ id: "tsavo-satao", placeId: "tsavo-east", name: "Satao Camp", type: "Tented camp", stars: 4, tier: "luxury", perNight: 65000, board: "Full board + game drives", cancellation: "50% refundable up to 30 days before", area: "Southern Tsavo East", features: ["Busy waterhole", "Game drives included", "Bush dinners"], image: IMG.tsavoElephants }),
  // Lake Nakuru
  S({ id: "nak-punda", placeId: "lake-nakuru", name: "Punda Milias Camp", type: "Budget camp", stars: 2, tier: "budget", perNight: 9000, board: "Bed & breakfast", cancellation: "Free cancellation up to 7 days before", area: "Outside the park", features: ["Garden tents", "Restaurant", "Parking"], image: IMG.nakuruLake }),
  S({ id: "nak-lodge", placeId: "lake-nakuru", name: "Lake Nakuru Lodge", type: "Safari lodge", stars: 4, tier: "mid", perNight: 24000, board: "Full board", cancellation: "Free cancellation up to 21 days before", area: "Inside the park", features: ["Inside the park", "Pool", "Lake views"], image: IMG.nakuruFlamingos }),
  S({ id: "nak-sopa", placeId: "lake-nakuru", name: "Lake Nakuru Sopa Lodge", type: "Safari lodge", stars: 4, tier: "luxury", perNight: 38000, board: "Full board", cancellation: "Free cancellation up to 30 days before", area: "Inside the park, hillside", features: ["Panoramic lake views", "Pool", "Spa"], image: IMG.nakuruFlock }),
  // Naivasha
  S({ id: "naiv-fisher", placeId: "naivasha", name: "Fisherman's Camp", type: "Budget camp", stars: 2, tier: "budget", perNight: 7000, board: "Room only", cancellation: "Free cancellation up to 3 days before", area: "South lake shore", features: ["Lakeside camping & bandas", "Hippos at night", "Boat trips"], image: IMG.nakuruLake }),
  S({ id: "naiv-sopa", placeId: "naivasha", name: "Lake Naivasha Sopa Resort", type: "Beach resort", stars: 4, tier: "mid", perNight: 22000, board: "Half board", cancellation: "Free cancellation up to 14 days before", area: "South lake shore", features: ["Pool", "Lawns with grazing animals", "Spa", "Kids' club"], image: IMG.nakuruFlock }),
  S({ id: "naiv-loldia", placeId: "naivasha", name: "Loldia House", type: "Boutique hotel", stars: 5, tier: "luxury", perNight: 75000, board: "Full board", cancellation: "50% refundable up to 30 days before", area: "Western lake shore", features: ["Historic farmhouse", "Horse riding", "Boat trips included"], image: IMG.nakuruLake }),
  // Samburu
  S({ id: "sam-riverside", placeId: "samburu", name: "Samburu Riverside Camp", type: "Tented camp", stars: 3, tier: "budget", perNight: 13000, board: "Full board", cancellation: "Free cancellation up to 14 days before", area: "Ewaso Ng'iro river", features: ["Riverside tents", "Cultural visits", "Game drives bookable"], image: IMG.samburuPeople }),
  S({ id: "sam-ashnil", placeId: "samburu", name: "Ashnil Samburu Camp", type: "Tented camp", stars: 4, tier: "mid", perNight: 34000, board: "Full board", cancellation: "Free cancellation up to 30 days before", area: "Riverbank, inside the reserve", features: ["Inside the reserve", "Pool", "River views"], image: IMG.samburuElephants }),
  S({ id: "sam-saruni", placeId: "samburu", name: "Saruni Samburu", type: "Safari lodge", stars: 5, tier: "luxury", perNight: 110000, board: "All-inclusive", cancellation: "Non-refundable within 60 days", area: "Kalama Conservancy", features: ["Rock-pool villas", "Walking safaris", "Night drives", "Drinks included"], image: IMG.samburuElephants }),
  // Mount Kenya / Laikipia
  S({ id: "mk-cottages", placeId: "mount-kenya", name: "Nanyuki Guest Cottages", type: "Guesthouse", stars: 2, tier: "budget", perNight: 6500, board: "Bed & breakfast", cancellation: "Free cancellation up to 3 days before", area: "Nanyuki town", features: ["Garden", "Wi-Fi", "Parking"], image: IMG.mountKenyaHike }),
  S({ id: "mk-sweetwaters", placeId: "mount-kenya", name: "Sweetwaters Serena Camp", type: "Tented camp", stars: 4, tier: "mid", perNight: 30000, board: "Full board", cancellation: "Free cancellation up to 30 days before", area: "Ol Pejeta Conservancy", features: ["Waterhole", "Rhino sanctuary nearby", "Pool"], image: IMG.mountKenya }),
  S({ id: "mk-fairmont", placeId: "mount-kenya", name: "Fairmont Mount Kenya Safari Club", type: "Boutique hotel", stars: 5, tier: "luxury", perNight: 70000, board: "Half board", cancellation: "Free cancellation up to 14 days before", area: "Nanyuki, on the equator", features: ["Mountain views", "Golf", "Spa", "Pool"], image: IMG.mountKenya }),
  // Nairobi
  S({ id: "nbo-wildebeest", placeId: "nairobi", name: "Wildebeest Eco Camp", type: "Budget camp", stars: 2, tier: "budget", perNight: 6500, board: "Bed & breakfast", cancellation: "Free cancellation up to 3 days before", area: "Lang'ata, near the national park", features: ["Garden tents", "Restaurant", "Near the park & Giraffe Centre"], image: IMG.nairobiParkZebra }),
  S({ id: "nbo-tamarind", placeId: "nairobi", name: "Tamarind Tree Hotel", type: "City hotel", stars: 4, tier: "mid", perNight: 16000, board: "Bed & breakfast", cancellation: "Free cancellation up to 1 day before", area: "Lang'ata", features: ["Pool", "Wi-Fi", "Airport shuttle", "Gym"], image: IMG.nairobiSkyline }),
  S({ id: "nbo-hemingways", placeId: "nairobi", name: "Hemingways Nairobi", type: "Boutique hotel", stars: 5, tier: "luxury", perNight: 85000, board: "Bed & breakfast", cancellation: "Free cancellation up to 7 days before", area: "Karen", features: ["Ngong Hills views", "Spa", "Butler service", "Pool"], image: IMG.nairobiParkGiraffe }),
  S({ id: "nbo-giraffe-manor", placeId: "nairobi", name: "Giraffe Manor", type: "Boutique hotel", stars: 5, tier: "luxury", perNight: 160000, board: "Full board", cancellation: "Non-refundable within 60 days", area: "Lang'ata", features: ["Giraffes at breakfast", "Historic manor", "Giraffe Centre access"], image: IMG.nairobiParkGiraffe }),
  // Mombasa
  S({ id: "msa-tamarind", placeId: "mombasa", name: "Tamarind Village", type: "City hotel", stars: 3, tier: "budget", perNight: 8000, board: "Room only", cancellation: "Free cancellation up to 2 days before", area: "Nyali, creek side", features: ["Serviced apartments", "Pool", "Creek views"], image: IMG.mombasaSunrise }),
  S({ id: "msa-whitesands", placeId: "mombasa", name: "Sarova Whitesands", type: "Beach resort", stars: 4, tier: "mid", perNight: 22000, board: "Half board", cancellation: "Free cancellation up to 14 days before", area: "Bamburi beach", features: ["Beachfront", "Pools", "Kids' club", "Spa"], image: IMG.mombasaBeach }),
  S({ id: "msa-serena", placeId: "mombasa", name: "Serena Beach Resort", type: "Beach resort", stars: 5, tier: "luxury", perNight: 42000, board: "Half board", cancellation: "Free cancellation up to 21 days before", area: "Shanzu", features: ["Swahili-village design", "Beachfront", "Spa", "Water sports"], image: IMG.mombasaBeach }),
  // Diani
  S({ id: "dia-backpackers", placeId: "diani", name: "Diani Backpackers", type: "Hostel", stars: 1, tier: "budget", perNight: 4500, board: "Room only", cancellation: "Free cancellation up to 2 days before", area: "Diani Beach Road", features: ["Dorms & private rooms", "Pool", "Social events", "Kitchen"], image: IMG.dianiShore }),
  S({ id: "dia-kinondo", placeId: "diani", name: "Diani Sea Lodge", type: "Beach resort", stars: 3, tier: "budget", perNight: 14000, board: "Half board", cancellation: "Free cancellation up to 7 days before", area: "Diani Beach, south", features: ["Beachfront", "Pool", "Garden cottages"], image: IMG.dianiSunset }),
  S({ id: "dia-leopard", placeId: "diani", name: "Leopard Beach Resort", type: "Beach resort", stars: 5, tier: "mid", perNight: 26000, board: "Half board", cancellation: "Free cancellation up to 14 days before", area: "Diani Beach, central", features: ["Beachfront", "Spa", "Several pools", "Kids' club"], image: IMG.dianiPalms }),
  S({ id: "dia-swahili", placeId: "diani", name: "The Swahili Beach", type: "Beach resort", stars: 5, tier: "luxury", perNight: 38000, board: "All-inclusive", cancellation: "Free cancellation up to 21 days before", area: "Diani Beach, north", features: ["All-inclusive", "Infinity pools", "Spa", "Beachfront"], image: IMG.dianiShore }),
  S({ id: "dia-almanara", placeId: "diani", name: "Almanara Luxury Villas", type: "Villa", stars: 5, tier: "luxury", perNight: 90000, board: "Bed & breakfast", cancellation: "50% refundable up to 30 days before", area: "Galu Beach", features: ["Private villas", "Private pool", "Chef on request", "Beachfront"], image: IMG.dianiPalms }),
  // Watamu & Kilifi
  S({ id: "wat-ocean", placeId: "watamu", name: "Ocean Sports Resort", type: "Beach resort", stars: 3, tier: "budget", perNight: 9000, board: "Bed & breakfast", cancellation: "Free cancellation up to 7 days before", area: "Watamu beach", features: ["Beachfront", "Pool", "Fishing trips"], image: IMG.watamuBay }),
  S({ id: "wat-hemingways", placeId: "watamu", name: "Hemingways Watamu", type: "Beach resort", stars: 5, tier: "mid", perNight: 32000, board: "Half board", cancellation: "Free cancellation up to 14 days before", area: "Watamu, Turtle Bay", features: ["Ocean-view rooms", "Spa", "Deep-sea fishing", "Pool"], image: IMG.watamuSwim }),
  S({ id: "wat-medina", placeId: "watamu", name: "Medina Palms", type: "Villa", stars: 5, tier: "luxury", perNight: 60000, board: "Bed & breakfast", cancellation: "Free cancellation up to 30 days before", area: "Watamu beach", features: ["Suites & villas", "Private pools", "Spa"], image: IMG.watamuBay }),
  // Lamu
  S({ id: "lamu-jannat", placeId: "lamu", name: "Jannat House", type: "Guesthouse", stars: 2, tier: "budget", perNight: 7500, board: "Bed & breakfast", cancellation: "Free cancellation up to 7 days before", area: "Lamu Old Town", features: ["Swahili house", "Rooftop terrace", "Plunge pool"], image: IMG.lamuTown }),
  S({ id: "lamu-house", placeId: "lamu", name: "Lamu House", type: "Boutique hotel", stars: 4, tier: "mid", perNight: 24000, board: "Bed & breakfast", cancellation: "Free cancellation up to 14 days before", area: "Lamu waterfront", features: ["Waterfront", "Pools", "Dhow trips"], image: IMG.lamuWater }),
  S({ id: "lamu-majlis", placeId: "lamu", name: "The Majlis", type: "Beach resort", stars: 5, tier: "luxury", perNight: 55000, board: "Half board", cancellation: "Free cancellation up to 21 days before", area: "Manda Island", features: ["Beachfront", "Boat transfers", "Pool", "Art collection"], image: IMG.lamuDhow }),
];

export const staysFor = (placeId: string) => STAYS.filter((s) => s.placeId === placeId);
export const STAY_BY_ID = Object.fromEntries(STAYS.map((s) => [s.id, s])) as Record<string, Stay>;
