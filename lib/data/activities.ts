import { IMG } from "./images";

export type ActivityCategory =
  | "Wildlife & safaris"
  | "Water & beach"
  | "Culture & history"
  | "Food & drink"
  | "Adventure & outdoors"
  | "Day trips"
  | "Wellness & relaxation"
  | "Nightlife";

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "Wildlife & safaris",
  "Water & beach",
  "Adventure & outdoors",
  "Culture & history",
  "Day trips",
  "Food & drink",
  "Wellness & relaxation",
  "Nightlife",
];

export interface Tour {
  id: string;
  placeId: string;
  title: string;
  category: ActivityCategory;
  /** minutes */
  duration: number;
  /** indicative KES per person */
  priceFrom: number;
  startTime: string;
  slot: "morning" | "afternoon" | "evening" | "full-day";
  highlights: string[];
  includes: string[];
  freeCancellation: boolean;
  pickup: boolean;
  /** Tembea editors' pick */
  pick?: boolean;
  image: string;
}

/**
 * Bookable experience types per destination (Viator / GetYourGuide-style). Prices are indicative
 * per person; real availability comes from marketplace vendors or partner APIs.
 */
const T = (t: Tour) => t;

export const TOURS: Tour[] = [
  /* ---------- Diani (Kwale) ---------- */
  T({ id: "dia-kisite", placeId: "diani", title: "Kisite-Mpunguti dolphin & snorkel dhow trip", category: "Water & beach", duration: 420, priceFrom: 9500, startTime: "08:00", slot: "full-day", highlights: ["Dolphin spotting", "Snorkel the marine park", "Seafood lunch on Wasini"], includes: ["Hotel pick-up", "Snorkel gear", "Park fees", "Lunch"], freeCancellation: true, pickup: true, pick: true, image: IMG.dianiShore }),
  T({ id: "dia-kite", placeId: "diani", title: "Kitesurf taster lesson", category: "Water & beach", duration: 120, priceFrom: 8000, startTime: "14:00", slot: "afternoon", highlights: ["IKO-certified instructors", "Best wind Dec–Mar & Jun–Sep"], includes: ["Kite & board", "Harness", "Instructor"], freeCancellation: true, pickup: false, image: IMG.dianiPalms }),
  T({ id: "dia-snorkel", placeId: "diani", title: "Glass-bottom boat & reef snorkel", category: "Water & beach", duration: 150, priceFrom: 3500, startTime: "09:00", slot: "morning", highlights: ["Coral reef at low tide", "Starfish & tropical fish"], includes: ["Boat", "Snorkel gear", "Guide"], freeCancellation: true, pickup: false, image: IMG.dianiShore }),
  T({ id: "dia-skydive", placeId: "diani", title: "Tandem skydive over Diani", category: "Adventure & outdoors", duration: 180, priceFrom: 45000, startTime: "10:00", slot: "morning", highlights: ["Ocean & reef views from 10,000 ft", "Beach landing"], includes: ["Instructor", "Briefing", "Optional video"], freeCancellation: false, pickup: false, image: IMG.dianiSunset }),
  T({ id: "dia-colobus", placeId: "diani", title: "Colobus Conservation forest walk", category: "Wildlife & safaris", duration: 90, priceFrom: 1500, startTime: "09:00", slot: "morning", highlights: ["Angolan colobus monkeys", "Coastal forest", "Conservation talk"], includes: ["Guide"], freeCancellation: true, pickup: false, image: IMG.dianiPalms }),
  T({ id: "dia-shimba", placeId: "diani", title: "Shimba Hills safari & Sheldrick Falls", category: "Day trips", duration: 360, priceFrom: 7500, startTime: "07:30", slot: "full-day", highlights: ["Sable antelope", "Elephants", "Waterfall hike"], includes: ["Transport", "Park fees", "Guide", "Lunch"], freeCancellation: true, pickup: true, image: IMG.dianiShore }),
  T({ id: "dia-quad", placeId: "diani", title: "Quad bike village & bush tour", category: "Adventure & outdoors", duration: 120, priceFrom: 6000, startTime: "15:00", slot: "afternoon", highlights: ["Rural villages", "Baobab forest"], includes: ["Quad bike", "Helmet", "Guide"], freeCancellation: true, pickup: true, image: IMG.dianiSunset }),
  T({ id: "dia-kongo", placeId: "diani", title: "Kongo Mosque & mangrove kayak", category: "Culture & history", duration: 150, priceFrom: 3000, startTime: "08:30", slot: "morning", highlights: ["14th-century mosque", "Kayak the Mwachema creek"], includes: ["Kayak", "Guide"], freeCancellation: true, pickup: false, image: IMG.dianiPalms }),
  T({ id: "dia-seafood", placeId: "diani", title: "Sunset seafood dinner in a coral cave", category: "Food & drink", duration: 150, priceFrom: 6500, startTime: "19:00", slot: "evening", highlights: ["Candle-lit cave dining", "Catch of the day"], includes: ["3-course dinner"], freeCancellation: false, pickup: false, image: IMG.dianiSunset }),
  T({ id: "dia-spa", placeId: "diani", title: "Beachfront Swahili spa ritual", category: "Wellness & relaxation", duration: 90, priceFrom: 5500, startTime: "16:00", slot: "afternoon", highlights: ["Coconut scrub", "Massage with ocean sounds"], includes: ["90-min treatment"], freeCancellation: true, pickup: false, image: IMG.dianiShore }),
  T({ id: "dia-night", placeId: "diani", title: "Beach bar & live music night", category: "Nightlife", duration: 180, priceFrom: 2000, startTime: "20:00", slot: "evening", highlights: ["Live bands & DJs", "Bonfire on the sand"], includes: ["Welcome drink"], freeCancellation: true, pickup: false, image: IMG.dianiSunset }),

  /* ---------- Watamu & Kilifi ---------- */
  T({ id: "wat-marine", placeId: "watamu", title: "Watamu Marine Park snorkel & glass-bottom boat", category: "Water & beach", duration: 180, priceFrom: 5000, startTime: "09:00", slot: "morning", highlights: ["Coral gardens", "Turtles & reef fish"], includes: ["Boat", "Snorkel gear", "Park fees"], freeCancellation: true, pickup: true, pick: true, image: IMG.watamuSwim }),
  T({ id: "wat-turtle", placeId: "watamu", title: "Local Ocean turtle rescue centre visit", category: "Wildlife & safaris", duration: 60, priceFrom: 1000, startTime: "14:00", slot: "afternoon", highlights: ["Sea turtle rehabilitation", "Conservation talk"], includes: ["Guided visit"], freeCancellation: true, pickup: false, image: IMG.watamuBay }),
  T({ id: "wat-mida", placeId: "watamu", title: "Mida Creek sunset canoe & boardwalk", category: "Adventure & outdoors", duration: 120, priceFrom: 3500, startTime: "17:00", slot: "evening", highlights: ["Mangrove boardwalk", "Flamingos & waders", "Sunset paddle"], includes: ["Canoe", "Guide"], freeCancellation: true, pickup: false, image: IMG.watamuBay }),
  T({ id: "wat-gede", placeId: "watamu", title: "Gede Ruins & Arabuko Sokoke forest", category: "Culture & history", duration: 180, priceFrom: 2500, startTime: "08:30", slot: "morning", highlights: ["13th-century Swahili town", "Endemic forest birds"], includes: ["Guide", "Entry"], freeCancellation: true, pickup: true, image: IMG.watamuSwim }),
  T({ id: "kil-creek", placeId: "watamu", title: "Kilifi Creek dhow cruise", category: "Water & beach", duration: 150, priceFrom: 4000, startTime: "16:00", slot: "afternoon", highlights: ["Under the Kilifi bridge", "Sundowner on the creek"], includes: ["Dhow", "Snacks & drinks"], freeCancellation: true, pickup: false, image: IMG.lamuDhow }),
  T({ id: "kil-mnarani", placeId: "watamu", title: "Mnarani Ruins & Bofa Beach day", category: "Day trips", duration: 300, priceFrom: 3500, startTime: "09:00", slot: "full-day", highlights: ["Swahili ruins above Kilifi Creek", "Quiet Bofa Beach"], includes: ["Transport", "Guide"], freeCancellation: true, pickup: true, image: IMG.watamuBay }),
  T({ id: "wat-crab", placeId: "watamu", title: "Crab Shack dinner on Mida Creek", category: "Food & drink", duration: 120, priceFrom: 3000, startTime: "18:30", slot: "evening", highlights: ["Mangrove setting", "Fresh crab & fish"], includes: ["Dinner"], freeCancellation: false, pickup: false, image: IMG.watamuSwim }),

  /* ---------- Mombasa ---------- */
  T({ id: "msa-fort", placeId: "mombasa", title: "Fort Jesus & Old Town walking tour", category: "Culture & history", duration: 180, priceFrom: 3000, startTime: "09:00", slot: "morning", highlights: ["UNESCO fort", "Spice market", "Carved doors"], includes: ["Guide", "Fort entry"], freeCancellation: true, pickup: true, pick: true, image: IMG.fortJesus }),
  T({ id: "msa-food", placeId: "mombasa", title: "Swahili street-food tour", category: "Food & drink", duration: 150, priceFrom: 3000, startTime: "18:00", slot: "evening", highlights: ["Mahamri & viazi karai", "Biryani", "Tamarind juice"], includes: ["Tastings", "Guide"], freeCancellation: true, pickup: false, image: IMG.mombasaSunrise }),
  T({ id: "msa-dhow", placeId: "mombasa", title: "Tamarind dhow dinner cruise", category: "Food & drink", duration: 180, priceFrom: 9000, startTime: "19:00", slot: "evening", highlights: ["Tudor Creek by night", "Seafood dinner on board"], includes: ["Dinner", "Live music"], freeCancellation: false, pickup: true, image: IMG.lamuDhow }),
  T({ id: "msa-haller", placeId: "mombasa", title: "Haller Park wildlife sanctuary", category: "Wildlife & safaris", duration: 120, priceFrom: 1600, startTime: "14:30", slot: "afternoon", highlights: ["Giraffe feeding", "Hippos", "Restored quarry"], includes: ["Entry"], freeCancellation: true, pickup: false, image: IMG.mombasaBeach }),
  T({ id: "msa-tsavo", placeId: "mombasa", title: "Tsavo East day safari from Mombasa", category: "Day trips", duration: 720, priceFrom: 14000, startTime: "05:30", slot: "full-day", highlights: ["Red elephants", "Lions", "Lunch in the park"], includes: ["Safari van", "Park fees", "Lunch"], freeCancellation: true, pickup: true, image: IMG.tsavoElephants }),

  /* ---------- Lamu ---------- */
  T({ id: "lamu-dhow", placeId: "lamu", title: "Sunset dhow sail", category: "Water & beach", duration: 120, priceFrom: 4500, startTime: "17:00", slot: "evening", highlights: ["Traditional dhow", "Shela dunes at sunset"], includes: ["Captain & crew", "Soft drinks"], freeCancellation: true, pickup: false, pick: true, image: IMG.lamuDhow }),
  T({ id: "lamu-heritage", placeId: "lamu", title: "Old Town heritage walk & museum", category: "Culture & history", duration: 150, priceFrom: 1500, startTime: "09:00", slot: "morning", highlights: ["Carved doors", "Lamu Museum", "Donkey Sanctuary"], includes: ["Guide", "Museum entry"], freeCancellation: true, pickup: false, image: IMG.lamuTown }),
  T({ id: "lamu-takwa", placeId: "lamu", title: "Takwa Ruins & Manda Island day trip", category: "Day trips", duration: 360, priceFrom: 6000, startTime: "09:00", slot: "full-day", highlights: ["Ruined Swahili town", "Mangrove channels", "Beach picnic"], includes: ["Boat", "Guide", "Lunch"], freeCancellation: true, pickup: true, image: IMG.lamuWater }),
  T({ id: "lamu-cook", placeId: "lamu", title: "Swahili cooking class", category: "Food & drink", duration: 180, priceFrom: 4000, startTime: "10:00", slot: "morning", highlights: ["Coconut fish curry", "Pilau", "Eat what you cook"], includes: ["Ingredients", "Lunch"], freeCancellation: true, pickup: false, image: IMG.lamuTown }),

  /* ---------- Maasai Mara ---------- */
  T({ id: "mara-balloon", placeId: "maasai-mara", title: "Sunrise hot-air balloon safari", category: "Wildlife & safaris", duration: 240, priceFrom: 64000, startTime: "05:30", slot: "morning", highlights: ["1-hour flight", "Champagne bush breakfast", "Flight certificate"], includes: ["Camp pick-up", "Flight", "Breakfast"], freeCancellation: false, pickup: true, pick: true, image: IMG.maraBalloon }),
  T({ id: "mara-crossing", placeId: "maasai-mara", title: "Full-day Mara River crossing drive", category: "Wildlife & safaris", duration: 540, priceFrom: 9000, startTime: "06:30", slot: "full-day", highlights: ["River crossings (Jul–Oct)", "Big cats", "Picnic lunch"], includes: ["4x4 & guide", "Packed lunch"], freeCancellation: true, pickup: true, image: IMG.maraMigration }),
  T({ id: "mara-walk", placeId: "maasai-mara", title: "Guided bush walk with a Maasai ranger", category: "Adventure & outdoors", duration: 120, priceFrom: 4500, startTime: "16:00", slot: "afternoon", highlights: ["Tracks & medicinal plants", "Conservancy only"], includes: ["Armed ranger", "Guide"], freeCancellation: true, pickup: true, image: IMG.maraSunset }),
  T({ id: "mara-village", placeId: "maasai-mara", title: "Maasai village (manyatta) visit", category: "Culture & history", duration: 90, priceFrom: 3000, startTime: "15:00", slot: "afternoon", highlights: ["Adumu jumping dance", "Fire-making", "Beadwork"], includes: ["Community fee"], freeCancellation: true, pickup: false, image: IMG.maasaiWomen }),
  T({ id: "mara-night", placeId: "maasai-mara", title: "Night game drive", category: "Wildlife & safaris", duration: 120, priceFrom: 6000, startTime: "19:30", slot: "evening", highlights: ["Nocturnal animals", "Spotlight tracking", "Conservancy only"], includes: ["4x4 & guide"], freeCancellation: true, pickup: true, image: IMG.starrySavanna }),
  T({ id: "mara-sundowner", placeId: "maasai-mara", title: "Escarpment sundowner & bush dinner", category: "Food & drink", duration: 180, priceFrom: 7500, startTime: "17:30", slot: "evening", highlights: ["Oloololo escarpment views", "Dinner under the stars"], includes: ["Drinks", "Dinner", "Transfers"], freeCancellation: false, pickup: true, image: IMG.maraSunset }),

  /* ---------- Amboseli ---------- */
  T({ id: "amb-kili", placeId: "amboseli", title: "Kilimanjaro sunrise game drive", category: "Wildlife & safaris", duration: 240, priceFrom: 7000, startTime: "06:00", slot: "morning", highlights: ["Elephants under Kili", "Swamp birdlife"], includes: ["4x4 & guide"], freeCancellation: true, pickup: true, pick: true, image: IMG.amboseliKili }),
  T({ id: "amb-hill", placeId: "amboseli", title: "Observation Hill sunset hike", category: "Adventure & outdoors", duration: 60, priceFrom: 0, startTime: "17:00", slot: "evening", highlights: ["360° park views"], includes: [], freeCancellation: true, pickup: false, image: IMG.amboseliPlain }),
  T({ id: "amb-boma", placeId: "amboseli", title: "Maasai cultural boma visit", category: "Culture & history", duration: 90, priceFrom: 2500, startTime: "14:00", slot: "afternoon", highlights: ["Homestead tour", "Songs & dance"], includes: ["Community fee"], freeCancellation: true, pickup: false, image: IMG.maasaiShuka }),

  /* ---------- Nairobi ---------- */
  T({ id: "nbo-park", placeId: "nairobi", title: "Nairobi National Park sunrise drive", category: "Wildlife & safaris", duration: 240, priceFrom: 10500, startTime: "06:30", slot: "morning", highlights: ["Lions & rhinos with a skyline", "Ivory Burning Site"], includes: ["4x4 & guide", "Park fees"], freeCancellation: true, pickup: true, pick: true, image: IMG.nairobiParkZebra }),
  T({ id: "nbo-sheldrick", placeId: "nairobi", title: "Sheldrick elephant orphans visit", category: "Wildlife & safaris", duration: 60, priceFrom: 2000, startTime: "11:00", slot: "morning", highlights: ["Baby elephant feeding", "Keeper talk"], includes: ["Entry"], freeCancellation: false, pickup: false, image: IMG.nairobiParkGiraffe }),
  T({ id: "nbo-giraffe", placeId: "nairobi", title: "Giraffe Centre & Karen Blixen Museum", category: "Culture & history", duration: 210, priceFrom: 3500, startTime: "13:30", slot: "afternoon", highlights: ["Feed Rothschild's giraffes", "Out of Africa house"], includes: ["Transport", "Entries"], freeCancellation: true, pickup: true, image: IMG.nairobiParkGiraffe }),
  T({ id: "nbo-food", placeId: "nairobi", title: "Nyama choma & city food tour", category: "Food & drink", duration: 180, priceFrom: 4500, startTime: "18:30", slot: "evening", highlights: ["Roast goat", "Street snacks", "Local brews"], includes: ["Tastings", "Guide"], freeCancellation: true, pickup: true, image: IMG.nairobiNight }),
  T({ id: "nbo-night", placeId: "nairobi", title: "Westlands rooftop & nightlife crawl", category: "Nightlife", duration: 240, priceFrom: 3500, startTime: "20:00", slot: "evening", highlights: ["Rooftop bars", "Afrobeats clubs"], includes: ["Host", "Ride-hailing between stops"], freeCancellation: true, pickup: false, image: IMG.nairobiNight }),
  T({ id: "nbo-hells", placeId: "nairobi", title: "Hell's Gate cycling day trip", category: "Day trips", duration: 600, priceFrom: 9000, startTime: "07:00", slot: "full-day", highlights: ["Cycle among zebras", "Gorge hike", "Lake Naivasha boat ride"], includes: ["Transport", "Bike", "Park fees", "Boat"], freeCancellation: true, pickup: true, image: IMG.nakuruLake }),

  /* ---------- Naivasha, Nakuru, Samburu, Mt Kenya, Tsavo ---------- */
  T({ id: "naiv-boat", placeId: "naivasha", title: "Hippo boat ride & Crescent Island walk", category: "Wildlife & safaris", duration: 180, priceFrom: 6000, startTime: "15:00", slot: "afternoon", highlights: ["Hippos & fish eagles", "Walk among giraffes"], includes: ["Boat", "Island fee"], freeCancellation: true, pickup: false, pick: true, image: IMG.nakuruLake }),
  T({ id: "naiv-gate", placeId: "naivasha", title: "Hell's Gate cycle & gorge hike", category: "Adventure & outdoors", duration: 240, priceFrom: 3800, startTime: "08:00", slot: "morning", highlights: ["Fischer's Tower", "Lower gorge"], includes: ["Bike", "Gorge guide"], freeCancellation: true, pickup: false, image: IMG.nakuruFlock }),
  T({ id: "nak-rhino", placeId: "lake-nakuru", title: "Rhino & flamingo game drive", category: "Wildlife & safaris", duration: 240, priceFrom: 8000, startTime: "06:30", slot: "morning", highlights: ["Black & white rhino", "Baboon Cliff"], includes: ["4x4 & guide"], freeCancellation: true, pickup: true, pick: true, image: IMG.nakuruFlamingos }),
  T({ id: "sam-five", placeId: "samburu", title: "Samburu Special Five game drive", category: "Wildlife & safaris", duration: 240, priceFrom: 8000, startTime: "06:30", slot: "morning", highlights: ["Grevy's zebra", "Reticulated giraffe", "Gerenuk"], includes: ["4x4 & guide"], freeCancellation: true, pickup: true, pick: true, image: IMG.samburuElephants }),
  T({ id: "sam-village", placeId: "samburu", title: "Samburu village & camel walk", category: "Culture & history", duration: 120, priceFrom: 3500, startTime: "15:30", slot: "afternoon", highlights: ["Camel herding", "Beadwork", "Singing"], includes: ["Community fee", "Guide"], freeCancellation: true, pickup: false, image: IMG.samburuPeople }),
  T({ id: "mk-pejeta", placeId: "mount-kenya", title: "Ol Pejeta: northern white rhinos & chimps", category: "Wildlife & safaris", duration: 300, priceFrom: 9000, startTime: "07:00", slot: "morning", highlights: ["Last northern white rhinos", "Chimpanzee sanctuary"], includes: ["Conservancy fee", "Guide"], freeCancellation: true, pickup: true, pick: true, image: IMG.mountKenya }),
  T({ id: "mk-hike", placeId: "mount-kenya", title: "Mount Kenya forest day hike", category: "Adventure & outdoors", duration: 360, priceFrom: 6000, startTime: "07:30", slot: "full-day", highlights: ["Montane forest", "Colobus & birds", "Waterfalls"], includes: ["Mountain guide", "Park fees", "Packed lunch"], freeCancellation: true, pickup: true, image: IMG.mountKenyaHike }),
  T({ id: "tsavo-drive", placeId: "tsavo-east", title: "Aruba Dam & Lugard Falls drive", category: "Wildlife & safaris", duration: 360, priceFrom: 8500, startTime: "06:30", slot: "full-day", highlights: ["Red elephants", "Galana River rapids"], includes: ["4x4 & guide", "Packed lunch"], freeCancellation: true, pickup: true, pick: true, image: IMG.tsavoElephants }),
];

export const toursFor = (placeId: string) => TOURS.filter((t) => t.placeId === placeId);
