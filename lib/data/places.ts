import { IMG } from "./images";

export type Interest = "wildlife" | "beach" | "culture" | "adventure" | "food" | "city" | "relax";
export type Slot = "morning" | "afternoon" | "evening";
export type Tier = "budget" | "mid" | "luxury";

export interface ActivitySeed {
  title: string;
  slot: Slot;
  /** typical start time HH:MM */
  time: string;
  minutes: number;
  /** indicative cost per person in KES (0 = free) */
  cost: number;
  tags: Interest[];
  note?: string;
}

export interface Place {
  id: string;
  name: string;
  region: string;
  coords: [number, number];
  kind: "safari" | "beach" | "culture" | "city" | "nature";
  image: string;
  blurb: string;
  idealNights: number;
  minNights: number;
  interests: Interest[];
  /** a "gateway" is a sensible start/end point with an airport or SGR station */
  gateway?: boolean;
  aliases: string[];
  stays: Record<Tier, { name: string; perNight: number }>;
  activities: ActivitySeed[];
  dining: { lunch: string; dinner: string };
}

/**
 * Indicative 2026 prices in KES per person (park fees, activities) and per room-night (stays).
 * They are planning estimates for the demo, not quotes — connect real supplier APIs later.
 */
export const PLACES: Place[] = [
  {
    id: "nairobi",
    name: "Nairobi",
    region: "Nairobi",
    coords: [-1.2864, 36.8172],
    kind: "city",
    image: IMG.nairobiSkyline,
    blurb: "Capital city with a national park on its doorstep",
    idealNights: 2,
    minNights: 1,
    interests: ["city", "wildlife", "culture", "food"],
    gateway: true,
    aliases: ["nairobi", "nbo", "jkia"],
    stays: {
      budget: { name: "Wildebeest Eco Camp", perNight: 6500 },
      mid: { name: "Tamarind Tree Hotel", perNight: 16000 },
      luxury: { name: "Giraffe Manor", perNight: 160000 },
    },
    activities: [
      { title: "Nairobi National Park game drive", slot: "morning", time: "06:30", minutes: 240, cost: 10500, tags: ["wildlife"], note: "Go early for lions and rhino" },
      { title: "Sheldrick Wildlife Trust elephant orphans", slot: "morning", time: "11:00", minutes: 60, cost: 2000, tags: ["wildlife"], note: "Public visit 11:00–12:00 — book ahead" },
      { title: "Giraffe Centre, Lang'ata", slot: "afternoon", time: "14:00", minutes: 90, cost: 1500, tags: ["wildlife", "culture"] },
      { title: "Karen Blixen Museum", slot: "afternoon", time: "15:30", minutes: 75, cost: 1200, tags: ["culture"] },
      { title: "Kazuri Beads workshop", slot: "afternoon", time: "13:30", minutes: 60, cost: 0, tags: ["culture"] },
      { title: "Nairobi National Museum & Snake Park", slot: "afternoon", time: "14:00", minutes: 120, cost: 1200, tags: ["culture"] },
      { title: "Maasai Market (rotating venues)", slot: "afternoon", time: "15:00", minutes: 90, cost: 0, tags: ["culture", "city"] },
      { title: "KICC rooftop sunset view", slot: "evening", time: "17:30", minutes: 60, cost: 500, tags: ["city"] },
      { title: "Nyama choma dinner at Carnivore", slot: "evening", time: "19:00", minutes: 120, cost: 5500, tags: ["food"] },
      { title: "Westlands rooftop dinner", slot: "evening", time: "19:30", minutes: 120, cost: 4000, tags: ["food", "city"] },
    ],
    dining: { lunch: "Java House, Karen", dinner: "Talisman Restaurant" },
  },
  {
    id: "maasai-mara",
    name: "Maasai Mara",
    region: "Narok",
    coords: [-1.4061, 35.0089],
    kind: "safari",
    image: IMG.maraMigration,
    blurb: "Big cats and the Great Migration",
    idealNights: 3,
    minNights: 2,
    interests: ["wildlife", "adventure", "culture"],
    aliases: ["mara", "maasai mara", "masai mara", "migration"],
    stays: {
      budget: { name: "Mara Explorers Camp", perNight: 14000 },
      mid: { name: "Mara Sopa Lodge", perNight: 32000 },
      luxury: { name: "Angama Mara", perNight: 210000 },
    },
    activities: [
      { title: "Sunrise game drive — big cat country", slot: "morning", time: "06:00", minutes: 240, cost: 0, tags: ["wildlife"], note: "Park fee charged per day (see budget)" },
      { title: "Hot-air balloon safari + bush breakfast", slot: "morning", time: "05:30", minutes: 240, cost: 64000, tags: ["wildlife", "adventure"], note: "Book weeks ahead in Jul–Oct" },
      { title: "Full-day drive to the Mara River crossings", slot: "morning", time: "06:30", minutes: 540, cost: 0, tags: ["wildlife", "adventure"], note: "Packed lunch — crossings peak Jul–Oct" },
      { title: "Maasai village (manyatta) visit", slot: "afternoon", time: "15:00", minutes: 90, cost: 3000, tags: ["culture"] },
      { title: "Afternoon game drive", slot: "afternoon", time: "16:00", minutes: 150, cost: 0, tags: ["wildlife"] },
      { title: "Guided bush walk with a Maasai ranger", slot: "afternoon", time: "16:00", minutes: 120, cost: 4500, tags: ["adventure", "wildlife"], note: "In conservancies only" },
      { title: "Sundowner on the escarpment", slot: "evening", time: "18:00", minutes: 60, cost: 0, tags: ["relax"] },
      { title: "Campfire dinner under the stars", slot: "evening", time: "19:30", minutes: 90, cost: 0, tags: ["food", "relax"] },
    ],
    dining: { lunch: "Picnic lunch in the reserve", dinner: "Camp dinner" },
  },
  {
    id: "amboseli",
    name: "Amboseli",
    region: "Kajiado",
    coords: [-2.6527, 37.2606],
    kind: "safari",
    image: IMG.amboseliKili,
    blurb: "Elephants beneath Kilimanjaro",
    idealNights: 2,
    minNights: 1,
    interests: ["wildlife", "adventure"],
    aliases: ["amboseli", "kilimanjaro", "kili"],
    stays: {
      budget: { name: "Kibo Safari Camp", perNight: 12000 },
      mid: { name: "Ol Tukai Lodge", perNight: 30000 },
      luxury: { name: "Tortilis Camp", perNight: 120000 },
    },
    activities: [
      { title: "Kilimanjaro sunrise game drive", slot: "morning", time: "06:00", minutes: 240, cost: 0, tags: ["wildlife"], note: "Clearest views of Kili at dawn" },
      { title: "Observation Hill hike", slot: "afternoon", time: "15:30", minutes: 60, cost: 0, tags: ["adventure"] },
      { title: "Elephant swamps afternoon drive", slot: "afternoon", time: "16:00", minutes: 150, cost: 0, tags: ["wildlife"] },
      { title: "Maasai cultural boma visit", slot: "afternoon", time: "14:00", minutes: 90, cost: 2500, tags: ["culture"] },
      { title: "Sundowners facing Kilimanjaro", slot: "evening", time: "18:00", minutes: 60, cost: 0, tags: ["relax"] },
    ],
    dining: { lunch: "Lodge lunch", dinner: "Lodge dinner" },
  },
  {
    id: "tsavo-east",
    name: "Tsavo East",
    region: "Taita-Taveta",
    coords: [-2.7834, 38.7586],
    kind: "safari",
    image: IMG.tsavoElephants,
    blurb: "Red elephants and vast open plains",
    idealNights: 2,
    minNights: 1,
    interests: ["wildlife", "adventure"],
    aliases: ["tsavo", "tsavo east", "voi"],
    stays: {
      budget: { name: "Red Elephant Safari Lodge", perNight: 11000 },
      mid: { name: "Voi Safari Lodge", perNight: 22000 },
      luxury: { name: "Satao Camp", perNight: 65000 },
    },
    activities: [
      { title: "Game drive to Aruba Dam", slot: "morning", time: "06:30", minutes: 240, cost: 0, tags: ["wildlife"] },
      { title: "Lugard Falls & Galana River", slot: "afternoon", time: "14:30", minutes: 150, cost: 0, tags: ["adventure"] },
      { title: "Mudanda Rock viewpoint", slot: "afternoon", time: "15:30", minutes: 90, cost: 0, tags: ["wildlife", "adventure"] },
      { title: "Waterhole-view dinner", slot: "evening", time: "19:00", minutes: 90, cost: 0, tags: ["food", "relax"] },
    ],
    dining: { lunch: "Lodge lunch", dinner: "Waterhole terrace" },
  },
  {
    id: "lake-nakuru",
    name: "Lake Nakuru",
    region: "Nakuru",
    coords: [-0.3667, 36.0833],
    kind: "safari",
    image: IMG.nakuruFlamingos,
    blurb: "Flamingos, pelicans and rhinos",
    idealNights: 1,
    minNights: 1,
    interests: ["wildlife"],
    aliases: ["nakuru", "lake nakuru"],
    stays: {
      budget: { name: "Punda Milias Camp", perNight: 9000 },
      mid: { name: "Lake Nakuru Lodge", perNight: 24000 },
      luxury: { name: "Lake Nakuru Sopa Lodge", perNight: 38000 },
    },
    activities: [
      { title: "Rhino & flamingo game drive", slot: "morning", time: "06:30", minutes: 240, cost: 0, tags: ["wildlife"] },
      { title: "Baboon Cliff viewpoint", slot: "afternoon", time: "14:30", minutes: 60, cost: 0, tags: ["adventure"] },
      { title: "Makalia Falls picnic", slot: "afternoon", time: "13:00", minutes: 90, cost: 0, tags: ["relax"] },
    ],
    dining: { lunch: "Picnic at Baboon Cliff", dinner: "Lodge dinner" },
  },
  {
    id: "naivasha",
    name: "Lake Naivasha",
    region: "Nakuru",
    coords: [-0.7667, 36.4333],
    kind: "nature",
    image: IMG.nakuruLake,
    blurb: "Hippos, Hell's Gate cycling and Crescent Island",
    idealNights: 1,
    minNights: 1,
    interests: ["adventure", "wildlife", "relax"],
    aliases: ["naivasha", "hell's gate", "hells gate", "crescent island"],
    stays: {
      budget: { name: "Fisherman's Camp", perNight: 7000 },
      mid: { name: "Lake Naivasha Sopa Resort", perNight: 22000 },
      luxury: { name: "Loldia House", perNight: 75000 },
    },
    activities: [
      { title: "Cycle Hell's Gate gorge", slot: "morning", time: "08:00", minutes: 240, cost: 3800, tags: ["adventure"], note: "Bike hire at the gate" },
      { title: "Boat ride with hippos", slot: "afternoon", time: "15:00", minutes: 60, cost: 2500, tags: ["wildlife"] },
      { title: "Crescent Island walking safari", slot: "afternoon", time: "16:00", minutes: 90, cost: 4000, tags: ["wildlife", "adventure"] },
      { title: "Lakeside dinner", slot: "evening", time: "19:00", minutes: 90, cost: 2500, tags: ["food"] },
    ],
    dining: { lunch: "Ranch House Bistro", dinner: "Lakeside restaurant" },
  },
  {
    id: "samburu",
    name: "Samburu",
    region: "Samburu",
    coords: [0.6167, 37.5333],
    kind: "safari",
    image: IMG.samburuElephants,
    blurb: "The 'Samburu Special Five' and Ewaso Ng'iro river",
    idealNights: 2,
    minNights: 2,
    interests: ["wildlife", "culture", "adventure"],
    aliases: ["samburu", "buffalo springs", "shaba"],
    stays: {
      budget: { name: "Samburu Riverside Camp", perNight: 13000 },
      mid: { name: "Ashnil Samburu Camp", perNight: 34000 },
      luxury: { name: "Saruni Samburu", perNight: 110000 },
    },
    activities: [
      { title: "Special Five game drive (Grevy's zebra, reticulated giraffe…)", slot: "morning", time: "06:30", minutes: 240, cost: 0, tags: ["wildlife"] },
      { title: "Samburu village visit", slot: "afternoon", time: "15:00", minutes: 90, cost: 3000, tags: ["culture"] },
      { title: "Riverbank afternoon drive", slot: "afternoon", time: "16:00", minutes: 150, cost: 0, tags: ["wildlife"] },
      { title: "Bush dinner on the river", slot: "evening", time: "19:30", minutes: 90, cost: 0, tags: ["food", "relax"] },
    ],
    dining: { lunch: "Camp lunch", dinner: "Riverside dinner" },
  },
  {
    id: "mount-kenya",
    name: "Mount Kenya & Nanyuki",
    region: "Laikipia",
    coords: [-0.0167, 37.0667],
    kind: "nature",
    image: IMG.mountKenya,
    blurb: "Equator crossings, forest hikes and Ol Pejeta",
    idealNights: 2,
    minNights: 1,
    interests: ["adventure", "wildlife"],
    aliases: ["mount kenya", "mt kenya", "nanyuki", "ol pejeta", "laikipia"],
    stays: {
      budget: { name: "Nanyuki Guest Cottages", perNight: 6500 },
      mid: { name: "Sweetwaters Serena Camp", perNight: 30000 },
      luxury: { name: "Fairmont Mount Kenya Safari Club", perNight: 70000 },
    },
    activities: [
      { title: "Ol Pejeta: Northern white rhinos & chimps", slot: "morning", time: "07:00", minutes: 300, cost: 9000, tags: ["wildlife"] },
      { title: "Forest hike on Mount Kenya's lower slopes", slot: "morning", time: "07:30", minutes: 300, cost: 6000, tags: ["adventure"], note: "Guide required" },
      { title: "Equator crossing & water demonstration", slot: "afternoon", time: "15:00", minutes: 45, cost: 300, tags: ["culture"] },
      { title: "Fireside dinner with mountain views", slot: "evening", time: "19:00", minutes: 90, cost: 0, tags: ["food", "relax"] },
    ],
    dining: { lunch: "Le Rustique, Nanyuki", dinner: "Lodge dinner" },
  },
  {
    id: "mombasa",
    name: "Mombasa",
    region: "Mombasa",
    coords: [-4.0435, 39.6682],
    kind: "culture",
    image: IMG.fortJesus,
    blurb: "Fort Jesus, Old Town and Swahili food",
    idealNights: 2,
    minNights: 1,
    interests: ["culture", "food", "beach", "city"],
    gateway: true,
    aliases: ["mombasa", "fort jesus", "old town"],
    stays: {
      budget: { name: "Tamarind Village", perNight: 8000 },
      mid: { name: "Sarova Whitesands", perNight: 22000 },
      luxury: { name: "Serena Beach Resort", perNight: 42000 },
    },
    activities: [
      { title: "Fort Jesus guided tour", slot: "morning", time: "09:00", minutes: 120, cost: 1200, tags: ["culture"] },
      { title: "Old Town walking & spice market", slot: "morning", time: "11:00", minutes: 120, cost: 1500, tags: ["culture", "food"] },
      { title: "Haller Park wildlife sanctuary", slot: "afternoon", time: "14:30", minutes: 120, cost: 1600, tags: ["wildlife"] },
      { title: "Swahili street food tour", slot: "evening", time: "18:30", minutes: 120, cost: 3000, tags: ["food", "culture"] },
      { title: "Tamarind dhow dinner cruise", slot: "evening", time: "19:00", minutes: 150, cost: 9000, tags: ["food", "relax"] },
    ],
    dining: { lunch: "Barka Restaurant", dinner: "Forodhani, Old Town" },
  },
  {
    id: "diani",
    name: "Diani Beach",
    region: "Kwale",
    coords: [-4.3167, 39.5667],
    kind: "beach",
    image: IMG.dianiPalms,
    blurb: "White sand, reef snorkelling and colobus forest",
    idealNights: 3,
    minNights: 2,
    interests: ["beach", "relax", "adventure"],
    gateway: true,
    aliases: ["diani", "ukunda", "south coast"],
    stays: {
      budget: { name: "Diani Backpackers", perNight: 4500 },
      mid: { name: "Leopard Beach Resort", perNight: 26000 },
      luxury: { name: "Almanara Luxury Villas", perNight: 90000 },
    },
    activities: [
      { title: "Kisite-Mpunguti dolphin dhow trip", slot: "morning", time: "08:00", minutes: 420, cost: 9500, tags: ["beach", "wildlife", "adventure"], note: "Snorkel gear + seafood lunch on Wasini" },
      { title: "Colobus Conservation forest walk", slot: "morning", time: "09:00", minutes: 90, cost: 1500, tags: ["wildlife"] },
      { title: "Kitesurf taster lesson", slot: "afternoon", time: "14:00", minutes: 120, cost: 8000, tags: ["adventure", "beach"], note: "Best wind Dec–Mar & Jun–Sep" },
      { title: "Beach & pool afternoon", slot: "afternoon", time: "13:30", minutes: 180, cost: 0, tags: ["relax", "beach"] },
      { title: "Shimba Hills sable antelope drive", slot: "morning", time: "07:30", minutes: 300, cost: 4000, tags: ["wildlife", "adventure"] },
      { title: "Sunset seafood at Ali Barbour's Cave", slot: "evening", time: "19:30", minutes: 120, cost: 6500, tags: ["food"] },
      { title: "Beach bonfire evening", slot: "evening", time: "19:00", minutes: 90, cost: 0, tags: ["relax"] },
    ],
    dining: { lunch: "Nomad Beach Bar", dinner: "Ali Barbour's Cave" },
  },
  {
    id: "watamu",
    name: "Watamu & Malindi",
    region: "Kilifi",
    coords: [-3.3542, 40.0236],
    kind: "beach",
    image: IMG.watamuBay,
    blurb: "Marine park, turtles and Gede Ruins",
    idealNights: 2,
    minNights: 2,
    interests: ["beach", "relax", "culture", "wildlife"],
    gateway: true,
    aliases: ["watamu", "malindi", "kilifi", "gede"],
    stays: {
      budget: { name: "Ocean Sports Resort (garden)", perNight: 9000 },
      mid: { name: "Hemingways Watamu", perNight: 32000 },
      luxury: { name: "Medina Palms", perNight: 60000 },
    },
    activities: [
      { title: "Watamu Marine Park glass-bottom boat & snorkel", slot: "morning", time: "09:00", minutes: 180, cost: 5000, tags: ["beach", "wildlife"] },
      { title: "Local Ocean turtle rescue centre", slot: "afternoon", time: "14:00", minutes: 60, cost: 1000, tags: ["wildlife"] },
      { title: "Gede Ruins & Arabuko Sokoke forest", slot: "afternoon", time: "15:00", minutes: 150, cost: 1500, tags: ["culture", "adventure"] },
      { title: "Mida Creek sunset canoe", slot: "evening", time: "17:00", minutes: 120, cost: 3500, tags: ["relax", "adventure"] },
    ],
    dining: { lunch: "Papa Remo Beach", dinner: "Crab Shack, Mida Creek" },
  },
  {
    id: "lamu",
    name: "Lamu",
    region: "Lamu",
    coords: [-2.2717, 40.902],
    kind: "culture",
    image: IMG.lamuDhow,
    blurb: "Car-free Swahili island town",
    idealNights: 2,
    minNights: 2,
    interests: ["culture", "relax", "beach", "food"],
    gateway: true,
    aliases: ["lamu", "shela", "manda island"],
    stays: {
      budget: { name: "Jannat House", perNight: 7500 },
      mid: { name: "Lamu House", perNight: 24000 },
      luxury: { name: "The Majlis", perNight: 55000 },
    },
    activities: [
      { title: "Old Town heritage walk & Lamu Museum", slot: "morning", time: "09:00", minutes: 150, cost: 1500, tags: ["culture"] },
      { title: "Donkey Sanctuary & carved-door trail", slot: "afternoon", time: "15:00", minutes: 60, cost: 0, tags: ["culture"] },
      { title: "Shela beach afternoon", slot: "afternoon", time: "13:30", minutes: 180, cost: 0, tags: ["beach", "relax"] },
      { title: "Sunset dhow cruise", slot: "evening", time: "17:00", minutes: 120, cost: 4500, tags: ["relax", "culture"] },
      { title: "Swahili seafood dinner on the waterfront", slot: "evening", time: "19:30", minutes: 90, cost: 2500, tags: ["food"] },
    ],
    dining: { lunch: "Whispers Café", dinner: "Bush Gardens waterfront" },
  },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<string, Place>;

/** Daily park/conservancy entry, non-resident adult, KES (indicative). */
export const PARK_FEES: Record<string, number> = {
  "maasai-mara": 13000,
  amboseli: 10500,
  "tsavo-east": 6500,
  "lake-nakuru": 9000,
  samburu: 9000,
  naivasha: 0,
};

/** Food per person per day by tier, KES (indicative). */
export const FOOD_PER_DAY: Record<Tier, number> = { budget: 2500, mid: 5500, luxury: 12000 };

export const INTEREST_LABELS: Record<Interest, string> = {
  wildlife: "Wildlife",
  beach: "Beach",
  culture: "Culture",
  adventure: "Adventure",
  food: "Food",
  city: "City",
  relax: "Slow & relaxing",
};
