import { IMG } from "./images";

export type VRType = "Safari" | "Cultural" | "Beach" | "City";
export type TimeOfDay = "day" | "night";

/**
 * Where a scene's pixels come from.
 *  - youtube: a 360° YouTube video (all IDs below were checked as embeddable, equirectangular/mesh 360° on 2026-10-27).
 *  - video:   your own equirectangular MP4/WebM (e.g. Insta360 / Osmo 360 exports) placed in /public/vr/…
 *  - photo:   an equirectangular 360° photo in /public/vr/…
 * Self-hosted sources render in Tembea's own WebGL sphere — no third-party player at all.
 */
export type SceneSource = { kind: "youtube"; id: string; start?: number } | { kind: "video"; src: string } | { kind: "photo"; src: string };

export interface VRScene {
  id: string;
  title: string;
  /** what you're looking at — shown as the "spot" in the walk-through */
  spot: string;
  time: TimeOfDay;
  source: SceneSource;
  minutes: number;
  /** where the camera faces when the scene starts (degrees) */
  yaw?: number;
  premium?: boolean;
  /** creator credit (kept for attribution in data/exports) */
  credit: string;
}

export interface VRDestination {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  type: VRType;
  level: "Easy" | "Moderate" | "Adventurous";
  cover: string;
  gallery: string[];
  coords: [number, number];
  bestTime: string;
  fromNairobi: string;
  highlights: string[];
  /** id in the trip-planner knowledge base */
  plannerId: string;
  scenes: VRScene[];
}

const yt = (id: string, start?: number): SceneSource => ({ kind: "youtube", id, start });

export const VR_DESTINATIONS: VRDestination[] = [
  {
    slug: "maasai-mara",
    name: "Maasai Mara",
    region: "Narok County",
    tagline: "Big cats, endless grass and the Great Migration",
    description:
      "Kenya's most famous reserve: rolling savanna where lion prides, cheetahs and leopards follow the wildebeest and zebra herds across the Mara River.",
    type: "Safari",
    level: "Easy",
    cover: IMG.maraMigration,
    gallery: [IMG.maraBalloon, IMG.maraSunset, IMG.maraLion],
    coords: [-1.4061, 35.0089],
    bestTime: "Jul – Oct (migration), Jan – Feb",
    fromNairobi: "5–6h drive · 45 min flight",
    highlights: ["Mara River crossings", "Sunrise balloon safari", "Maasai village visit"],
    plannerId: "maasai-mara",
    scenes: [
      { id: "mara-drive", spot: "Zebra plains", title: "Game drive across the plains", time: "day", source: yt("EPP36G3Z3l4", 30), minutes: 17, credit: "Rob The Ranger Wildlife Videos" },
      { id: "mara-elephants", spot: "Elephant herd", title: "Among the Mara elephants", time: "day", source: yt("vVcUFoEQWP0", 3), minutes: 2, credit: "Richard Kuberski" },
      { id: "mara-village", spot: "Maasai village", title: "Inside a Maasai manyatta", time: "day", source: yt("t60d3p3vuTs", 2), minutes: 2, credit: "360Africa" },
      { id: "mara-balloon", spot: "Sunrise balloon", title: "Hot-air balloon at sunrise (8K)", time: "day", source: yt("Nuvd4boqVsU", 5), minutes: 4, premium: true, credit: "Odyssey Visual Media" },
      { id: "mara-wild", spot: "Wildlife all around", title: "Wild animals surround you", time: "day", source: yt("P44-kkFrO2c", 10), minutes: 8, premium: true, credit: "Jungle Boy Safari" },
    ],
  },
  {
    slug: "amboseli",
    name: "Amboseli",
    region: "Kajiado County",
    tagline: "Giant tuskers beneath Kilimanjaro",
    description: "Swamps and dust plains framed by Africa's highest peak. Amboseli's elephant families are among the most studied on earth.",
    type: "Safari",
    level: "Easy",
    cover: IMG.amboseliKili,
    gallery: [IMG.amboseliHerd, IMG.amboseliPlain],
    coords: [-2.6527, 37.2606],
    bestTime: "Jun – Oct, Jan – Feb (clear Kili views)",
    fromNairobi: "4h drive",
    highlights: ["Observation Hill", "Kilimanjaro sunrise", "Elephant swamps"],
    plannerId: "amboseli",
    scenes: [
      { id: "amb-drive", spot: "Swamp road", title: "Game drive in the long rains", time: "day", source: yt("Tp6YPlKh2C0", 5), minutes: 7, credit: "Roho Ya Chui" },
      { id: "amb-8k", spot: "Elephant country", title: "Safari adventure in 8K", time: "day", source: yt("6Pt1ISAW_MU", 3), minutes: 5, credit: "Christian D." },
      { id: "amb-drive2", spot: "Open plains", title: "Driving through the bush (8K)", time: "day", source: yt("btOOh5jdmOg", 2), minutes: 2, premium: true, credit: "Christian D." },
    ],
  },
  {
    slug: "tsavo-east",
    name: "Tsavo",
    region: "Taita-Taveta",
    tagline: "Red elephants and wild open country",
    description: "One of the world's largest parks — famous for elephants dusted red by the soil, the Galana River and the lava flows of Yatta Plateau.",
    type: "Safari",
    level: "Moderate",
    cover: IMG.tsavoElephants,
    gallery: [IMG.tsavoElephant2],
    coords: [-2.7834, 38.7586],
    bestTime: "Jun – Oct, Dec – Mar",
    fromNairobi: "5h drive · SGR to Voi",
    highlights: ["Red elephants at Aruba Dam", "Lugard Falls", "Mudanda Rock"],
    plannerId: "tsavo-east",
    scenes: [
      { id: "tsavo-view", spot: "Park lookout", title: "Tsavo panorama", time: "day", source: yt("nmEswliczro"), minutes: 1, credit: "Xoger" },
      { id: "tsavo-ngutuni", spot: "Waterhole lodge", title: "Ngutuni waterhole", time: "day", source: yt("pvkQH32VLZ0", 2), minutes: 1, credit: "Bausa" },
      { id: "tsavo-bluff", spot: "Taita Hills bluff", title: "Lions Bluff, Taita Hills", time: "day", source: yt("Ege3O2m41kY", 2), minutes: 1, premium: true, credit: "360Africa" },
    ],
  },
  {
    slug: "lake-nakuru",
    name: "Lake Nakuru",
    region: "Nakuru County",
    tagline: "Pink shorelines and rhino sanctuary",
    description: "A Rift Valley soda lake ringed by flamingos and pelicans, with one of Kenya's best chances to see both black and white rhino.",
    type: "Safari",
    level: "Easy",
    cover: IMG.nakuruFlamingos,
    gallery: [IMG.nakuruFlock, IMG.nakuruLake],
    coords: [-0.3667, 36.0833],
    bestTime: "Year-round · Jun – Mar driest",
    fromNairobi: "3h drive",
    highlights: ["Baboon Cliff viewpoint", "Rhino tracking", "Makalia Falls"],
    plannerId: "lake-nakuru",
    scenes: [{ id: "nak-circuit", spot: "Lake circuit", title: "Safari around Lake Nakuru", time: "day", source: yt("83lDGxVUetg", 40), minutes: 29, credit: "Yadideka VR" }],
  },
  {
    slug: "naivasha",
    name: "Naivasha & Hell's Gate",
    region: "Nakuru County",
    tagline: "Hippo boats and a gorge you can cycle",
    description: "A freshwater lake full of hippos and fish eagles, next to Hell's Gate — towering cliffs and a gorge you can explore on foot or by bike.",
    type: "Safari",
    level: "Moderate",
    cover: IMG.nakuruLake,
    gallery: [IMG.nakuruFlock],
    coords: [-0.7667, 36.4333],
    bestTime: "Year-round",
    fromNairobi: "1h 45m drive",
    highlights: ["Hippo boat ride", "Hell's Gate gorge", "Crescent Island walk"],
    plannerId: "naivasha",
    scenes: [
      { id: "naiv-boat", spot: "Lake boat", title: "Boat safari on Lake Naivasha", time: "day", source: yt("Tf8VyaUi_NU"), minutes: 1, credit: "MIK" },
      { id: "naiv-gorge", spot: "Hell's Gate", title: "Inside Hell's Gate", time: "day", source: yt("hF_poWaX1QI", 2), minutes: 2, credit: "J&K Lovett" },
    ],
  },
  {
    slug: "samburu",
    name: "Samburu",
    region: "Samburu County",
    tagline: "Camels, red earth and the Special Five",
    description: "Northern Kenya's dry country along the Ewaso Ng'iro river — reticulated giraffes, Grevy's zebras and Samburu herders with their camels.",
    type: "Safari",
    level: "Adventurous",
    cover: IMG.samburuElephants,
    gallery: [IMG.samburuPeople],
    coords: [0.6167, 37.5333],
    bestTime: "Jun – Oct, Dec – Mar",
    fromNairobi: "6h drive · 1h flight",
    highlights: ["Special Five game drive", "Camel herders", "Riverside camps"],
    plannerId: "samburu",
    scenes: [
      { id: "sam-drive", spot: "Morning drive", title: "Heading out on a morning game drive", time: "day", source: yt("khtXBjv7uec"), minutes: 1, credit: "Roho Ya Chui" },
      { id: "sam-camels", spot: "Camel herders", title: "Samburu herders with camels", time: "day", source: yt("FlfbH8Pz2V4"), minutes: 1, credit: "Roho Ya Chui" },
      { id: "sam-dawn", spot: "Camp at dawn", title: "A Samburu camp at dawn", time: "day", source: yt("ikaGuaorztM"), minutes: 1, premium: true, credit: "Roho Ya Chui" },
    ],
  },
  {
    slug: "laikipia",
    name: "Laikipia & Mount Kenya",
    region: "Laikipia County",
    tagline: "Conservancies in the shadow of Mount Kenya",
    description: "Private conservancies on the Laikipia plateau with Mount Kenya on the horizon — rhinos, wild dogs and some of Kenya's best walking safaris.",
    type: "Safari",
    level: "Moderate",
    cover: IMG.mountKenya,
    gallery: [IMG.mountKenyaHike],
    coords: [0.35, 36.9],
    bestTime: "Jun – Oct, Jan – Mar",
    fromNairobi: "3h 30m drive",
    highlights: ["Ol Pejeta rhinos", "Walking safaris", "Equator crossing"],
    plannerId: "mount-kenya",
    scenes: [
      { id: "lai-wild", spot: "Wildlife film trip", title: "Into the wild with andBeyond (8K)", time: "day", source: yt("YdUwUEhuDmY", 3), minutes: 4, credit: "Photos of Africa" },
      { id: "lai-bush", spot: "El Karama bush", title: "Driving through El Karama (8K)", time: "day", source: yt("U2vUEheuZko"), minutes: 1, credit: "360 GlobeTrekker" },
    ],
  },
  {
    slug: "lamu",
    name: "Lamu & Shela",
    region: "Lamu Archipelago",
    tagline: "Swahili alleys, donkeys and dhows",
    description: "A UNESCO-listed Swahili town with no cars: carved wooden doors, coral-stone houses and dhows sailing to Shela at sunset.",
    type: "Cultural",
    level: "Easy",
    cover: IMG.lamuDhow,
    gallery: [IMG.lamuWater, IMG.lamuTown],
    coords: [-2.2717, 40.902],
    bestTime: "Jun – Mar · Lamu Cultural Festival (Nov)",
    fromNairobi: "1h 30m flight",
    highlights: ["Dhow sunset cruise", "Lamu Fort & museum", "Shela beach"],
    plannerId: "lamu",
    scenes: [
      { id: "lamu-shela", spot: "Shela streets", title: "Walking the lanes of Shela", time: "day", source: yt("uZSoIlgXhjU", 5), minutes: 6, credit: "bluesnyc" },
      { id: "lamu-roof", spot: "Lamu rooftop", title: "Lamu town from a rooftop", time: "day", source: yt("K1Up6FRVVOA", 5), minutes: 7, credit: "bluesnyc" },
    ],
  },
  {
    slug: "fort-jesus",
    name: "Mombasa Old Town",
    region: "Mombasa",
    tagline: "Fort Jesus and 400 years of coastal history",
    description: "A 16th-century fortress guarding Mombasa's harbour, beside the narrow lanes, spice shops and carved balconies of Old Town.",
    type: "Cultural",
    level: "Easy",
    cover: IMG.fortJesus,
    gallery: [IMG.mombasaSunrise, IMG.mombasaBeach],
    coords: [-4.0627, 39.6795],
    bestTime: "Year-round · Jul – Mar driest",
    fromNairobi: "SGR 5h · 1h flight",
    highlights: ["Fort ramparts & museum", "Old Town spice lanes", "Likoni ferry views"],
    plannerId: "mombasa",
    scenes: [
      { id: "fj-fort", spot: "Fort Jesus", title: "Inside Fort Jesus", time: "day", source: yt("tz9Y5HSk-EI", 3), minutes: 4, credit: "Jason Pratts" },
      { id: "fj-oldtown", spot: "Old Town lanes", title: "Old Town Mombasa", time: "day", source: yt("lDW6hspaR1g", 3), minutes: 3, credit: "Jason Pratts" },
      { id: "fj-view", spot: "Old Town square", title: "Old Town 360 view", time: "day", source: yt("c9EOaETyqNE", 3), minutes: 5, credit: "360 World" },
      { id: "fj-safari", spot: "Fort tour", title: "Full Fort Jesus VR tour", time: "day", source: yt("-lP3AggvRfM", 20), minutes: 19, premium: true, credit: "Makavazi Go" },
      { id: "fj-marina", spot: "La Marina", title: "La Marina waterfront", time: "day", source: yt("ojrVNX_jm9I", 5), minutes: 7, credit: "Virtual Reality 360 Life" },
    ],
  },
  {
    slug: "diani",
    name: "Diani Beach",
    region: "Kwale County",
    tagline: "White sand, turquoise reef, beach nights",
    description: "17 km of powder-white sand on the south coast — kitesurfing, snorkelling at Kisite and lively beach evenings.",
    type: "Beach",
    level: "Easy",
    cover: IMG.dianiPalms,
    gallery: [IMG.dianiShore, IMG.dianiSunset],
    coords: [-4.3167, 39.5667],
    bestTime: "Dec – Mar, Jul – Oct",
    fromNairobi: "1h flight to Ukunda",
    highlights: ["Kisite dolphin dhow trip", "Colobus Conservation", "Kite beach"],
    plannerId: "diani",
    scenes: [
      { id: "diani-walk", spot: "Shoreline", title: "Walking along Diani Beach", time: "day", source: yt("S2_Hz6U4oUQ"), minutes: 1, credit: "Garden of Knowledge" },
      { id: "diani-hotel", spot: "Hotel to sand", title: "From the hotel onto the beach", time: "day", source: yt("cCPkYHFVcV8"), minutes: 2, credit: "Garden of Knowledge" },
      { id: "diani-tide", spot: "Low tide", title: "Crystal water at low tide", time: "day", source: yt("rrQnu4d6iWY"), minutes: 1, credit: "Garden of Knowledge" },
      { id: "diani-vr", spot: "Beach panorama", title: "Diani in 360", time: "day", source: yt("DNRnoPwQaZ4", 3), minutes: 3, premium: true, credit: "Kam Dhatt" },
      { id: "diani-party", spot: "Beach party", title: "Party night at the backpackers", time: "night", source: yt("LNj22kVQQ-Q"), minutes: 1, credit: "Garden of Knowledge" },
      { id: "diani-garden", spot: "Garden at night", title: "Tropical garden after dark", time: "night", source: yt("edEsp1ejWf8"), minutes: 1, credit: "Garden of Knowledge" },
    ],
  },
  {
    slug: "watamu",
    name: "Watamu",
    region: "Kilifi County",
    tagline: "Mangrove creeks and marine-park blues",
    description: "A marine park of coral gardens and turtles, the Mida Creek mangroves and some of the coast's most beautiful bays.",
    type: "Beach",
    level: "Easy",
    cover: IMG.watamuBay,
    gallery: [IMG.watamuSwim],
    coords: [-3.3542, 40.0236],
    bestTime: "Dec – Mar, Jul – Oct",
    fromNairobi: "1h flight to Malindi",
    highlights: ["Mida Creek boardwalk", "Turtle rescue centre", "Marine park snorkel"],
    plannerId: "watamu",
    scenes: [
      { id: "wat-creek", spot: "Mida Creek", title: "The Crab Shack on Mida Creek", time: "day", source: yt("aTdoCDF_XnQ", 5), minutes: 4, credit: "Garden of Knowledge" },
      { id: "wat-flight", spot: "Beachfront", title: "Flying over Watamu Bay", time: "day", source: yt("xxmBr1TptUY"), minutes: 1, credit: "Hutchery360" },
    ],
  },
  {
    slug: "nairobi-city",
    name: "Nairobi City",
    region: "Nairobi",
    tagline: "Green City in the Sun — day and night",
    description: "East Africa's buzzing capital: rooftop views from KICC, Westlands, the expressway and a lively after-dark scene.",
    type: "City",
    level: "Easy",
    cover: IMG.nairobiSkyline,
    gallery: [IMG.nairobiNight, IMG.nairobiParkGiraffe],
    coords: [-1.2864, 36.8172],
    bestTime: "Year-round",
    fromNairobi: "You're here",
    highlights: ["KICC rooftop", "Westlands", "Nairobi National Park"],
    plannerId: "nairobi",
    scenes: [
      { id: "nbo-city", spot: "City centre", title: "Nairobi city streets", time: "day", source: yt("boaPQ7VIy_4"), minutes: 2, credit: "360 Kenya" },
      { id: "nbo-kicc", spot: "KICC rooftop", title: "View from the KICC rooftop", time: "day", source: yt("29bIsyRoaCc", 20), minutes: 13, credit: "Cleaning The Airwaves" },
      { id: "nbo-westlands", spot: "Westlands from above", title: "Westlands drone flight", time: "day", source: yt("eldezI2ISqU"), minutes: 1, credit: "360 Kenya" },
      { id: "nbo-sgr", spot: "SGR terminus", title: "Nairobi SGR station", time: "day", source: yt("IhEYMJTQZkk"), minutes: 2, premium: true, credit: "360 Kenya" },
      { id: "nbo-baboon", spot: "National Park", title: "Baboons in the park", time: "day", source: yt("RHqm0ZfMN5U"), minutes: 1, credit: "Analog Nomad 360" },
      { id: "nbo-night", spot: "Riverside at night", title: "Nairobi night from Riverside Drive", time: "night", source: yt("A68QEoAqLxI", 15), minutes: 13, credit: "African360VRQuests" },
      { id: "nbo-expressway", spot: "Midnight expressway", title: "Expressway at midnight", time: "night", source: yt("o7rDdwDX_ro", 15), minutes: 14, premium: true, credit: "African Tribes" },
    ],
  },
  {
    slug: "kenya-360-safari",
    name: "Kenya 360° Safari",
    region: "Premium 8K collection",
    tagline: "Full-immersion 8K safari — look in every direction",
    description: "Our premium 8K collection: stand among elephants, sit at a camp waterhole and wake up in Nairobi. Best on desktop with drag-to-look or a phone in a VR viewer.",
    type: "Safari",
    level: "Adventurous",
    cover: IMG.maraSunset,
    gallery: [IMG.starrySavanna, IMG.maraBalloon],
    coords: [-1.5, 35.3],
    bestTime: "Anytime — it's virtual",
    fromNairobi: "Instant",
    highlights: ["8K 360° wildlife", "Camp waterhole", "Good morning, Nairobi"],
    plannerId: "maasai-mara",
    scenes: [
      { id: "k360-8k", spot: "Elephant safari", title: "Magical elephant safari (8K)", time: "day", source: yt("ZyoGSs4f960", 3), minutes: 5, credit: "Christian D." },
      { id: "k360-camp", spot: "Sanctuary camp", title: "Sanctuary Olonana camp", time: "day", source: yt("lTN1LJgIsSo", 3), minutes: 3, premium: true, credit: "Photos of Africa" },
      { id: "k360-nairobi", spot: "Good morning, Nairobi", title: "Good morning, Nairobi", time: "day", source: yt("XK_69FgKkL0", 3), minutes: 4, premium: true, credit: "Talanton" },
      { id: "k360-olonana", spot: "River safari", title: "Safari on the Mara River", time: "day", source: yt("Ca0hMG2PZm4"), minutes: 2, premium: true, credit: "Photos of Africa" },
    ],
  },
];

export const VR_TYPES: VRType[] = ["Safari", "Cultural", "Beach", "City"];

export const getVR = (slug: string) => VR_DESTINATIONS.find((d) => d.slug === slug);

/** Planner place id → the best virtual preview for it. */
export const VR_FOR_PLACE: Record<string, string> = {
  nairobi: "nairobi-city",
  "maasai-mara": "maasai-mara",
  amboseli: "amboseli",
  "tsavo-east": "tsavo-east",
  "lake-nakuru": "lake-nakuru",
  naivasha: "naivasha",
  samburu: "samburu",
  "mount-kenya": "laikipia",
  mombasa: "fort-jesus",
  diani: "diani",
  watamu: "watamu",
  lamu: "lamu",
};

export const sceneThumb = (s: VRScene) => (s.source.kind === "youtube" ? `https://i.ytimg.com/vi/${s.source.id}/mqdefault.jpg` : undefined);
