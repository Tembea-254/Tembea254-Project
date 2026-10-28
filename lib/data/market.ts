import { IMG } from "./images";

/** The marketplace is for hiring people (and their vehicles) ahead of a trip. */
export type HireCategory = "Drivers & vehicles" | "Photographers" | "Local artists" | "Tour & local guides";
export const HIRE_CATEGORIES: HireCategory[] = ["Drivers & vehicles", "Photographers", "Local artists", "Tour & local guides"];

export const CATEGORY_BLURB: Record<HireCategory, string> = {
  "Drivers & vehicles": "Safari 4x4s, vans and transfers with a local driver",
  Photographers: "Safari, beach, wedding and portrait photographers",
  "Local artists": "Dancers, musicians, painters and craft teachers",
  "Tour & local guides": "Walking, birding, city and marine guides",
};

export interface Hub {
  id: string;
  name: string;
  short: string;
  region: string;
  image: string;
  /** towns covered, shown under the hub name */
  covers: string;
}

export const HUBS: Hub[] = [
  { id: "mara", name: "Maasai Mara", short: "Mara", region: "Narok County", image: IMG.maraMigration, covers: "Talek, Sekenani, Olkiombo, the conservancies" },
  { id: "diani", name: "Diani & South Coast", short: "Diani", region: "Kwale County", image: IMG.dianiPalms, covers: "Diani, Ukunda, Tiwi, Msambweni, Shimoni" },
  { id: "tsavo", name: "Tsavo", short: "Tsavo", region: "Taita-Taveta County", image: IMG.tsavoElephants, covers: "Voi, Tsavo East & West, Taita Hills" },
  { id: "nairobi", name: "Nairobi", short: "Nairobi", region: "Nairobi County", image: IMG.nairobiSkyline, covers: "CBD, Westlands, Karen, JKIA & Wilson airports" },
];

export type RateUnit = "per day" | "per half day" | "per session" | "per event" | "per transfer";

export interface Provider {
  id: string;
  hub: string;
  category: HireCategory;
  name: string;
  /** where they're based */
  base: string;
  headline: string;
  about: string;
  /** e.g. vehicle, kit or troupe size */
  offer: string;
  rate: number; // KES
  unit: RateUnit;
  /** what the rate covers / excludes */
  terms: string;
  languages: string[];
  years: number;
  specialties: string[];
  /** what Tembea checks before a provider in this category can list */
  checks: string[];
  image: string;
  /** placeholder profile — always labelled "Demo" in the UI */
  demo: boolean;
}

const DRIVER_CHECKS = ["National ID", "Driving licence & PSV badge", "Vehicle inspection & insurance"];
const GUIDE_CHECKS = ["National ID", "Guide certificate (KPSGA or KWS)"];
const PHOTO_CHECKS = ["National ID", "Portfolio reviewed"];
const ARTIST_CHECKS = ["National ID", "Group or business registration"];

/**
 * Demo profiles so the marketplace can be explored before real providers are onboarded.
 * Names are placeholders, not real businesses. Real providers apply via "Become a provider".
 */
export const PROVIDERS: Provider[] = [
  // ---------------- Maasai Mara ----------------
  { id: "mara-d1", hub: "mara", category: "Drivers & vehicles", name: "Talek Safari Drivers (demo)", base: "Talek Gate", headline: "Pop-up roof Land Cruiser with driver-guide", about: "Full-day game drives from camps around Talek and Sekenani. The driver doubles as your guide and knows the river-crossing points.", offer: "Toyota Land Cruiser 4x4 · pop-up roof · 7 seats", rate: 22000, unit: "per day", terms: "Includes driver and fuel inside the reserve. Park fees not included.", languages: ["English", "Swahili", "Maa"], years: 11, specialties: ["Game drives", "Migration crossings", "Charging sockets"], checks: DRIVER_CHECKS, image: IMG.maraLion, demo: true },
  { id: "mara-d2", hub: "mara", category: "Drivers & vehicles", name: "Narok Road Transfers (demo)", base: "Narok town", headline: "Safari van between Nairobi and the Mara", about: "Road transfers between Nairobi, Narok and Mara camps, with a game drive on the way in.", offer: "Toyota Hiace safari van · pop-up roof · 7 seats", rate: 16000, unit: "per day", terms: "Includes driver and fuel. Park fees not included.", languages: ["English", "Swahili"], years: 8, specialties: ["Nairobi ↔ Mara", "Airstrip pick-ups"], checks: DRIVER_CHECKS, image: IMG.maraMigration, demo: true },
  { id: "mara-g1", hub: "mara", category: "Tour & local guides", name: "Saitoti Walking Safaris (demo)", base: "Olkiombo", headline: "Maasai walking guide in the conservancies", about: "Tracks, medicinal plants and birds on foot, with an armed ranger where the conservancy requires one.", offer: "Morning or evening walks · up to 6 guests", rate: 9000, unit: "per half day", terms: "Per group. Conservancy fee paid at your camp.", languages: ["English", "Maa", "Swahili"], years: 9, specialties: ["Walking safaris", "Tracking", "Plants & medicine"], checks: GUIDE_CHECKS, image: IMG.maasaiWomen, demo: true },
  { id: "mara-g2", hub: "mara", category: "Tour & local guides", name: "Mara Birding with Lemayian (demo)", base: "Sekenani", headline: "Silver-level birding and wildlife guide", about: "Joins your vehicle for a full day and focuses on birds, cats and behaviour. Brings a field scope.", offer: "Joins your vehicle · binoculars and scope included", rate: 12000, unit: "per day", terms: "Guide only — book a driver and vehicle separately.", languages: ["English", "Swahili", "Maa"], years: 14, specialties: ["Birding", "Big cats", "Photography spots"], checks: GUIDE_CHECKS, image: IMG.maraSunset, demo: true },
  { id: "mara-p1", hub: "mara", category: "Photographers", name: "Wild Frame Mara (demo)", base: "Talek", headline: "Wildlife photographer who rides along", about: "Rides along on your game drive and shoots the sightings and your group, then hands over edited photos within 48 hours.", offer: "Full-frame + 600mm lens · 80+ edited photos", rate: 25000, unit: "per day", terms: "Vehicle not included. Online gallery delivered in 48h.", languages: ["English", "Swahili"], years: 7, specialties: ["Wildlife", "Couples on safari", "Sunrise balloons"], checks: PHOTO_CHECKS, image: IMG.maraBalloon, demo: true },
  { id: "mara-a1", hub: "mara", category: "Local artists", name: "Enkiteng Dancers & Singers (demo)", base: "Olkiombo", headline: "Maasai song and adumu jumping dance", about: "A troupe of 10–14 from the village performs at your camp or boma dinner and explains each song.", offer: "Troupe of 10–14 · 45-minute performance", rate: 15000, unit: "per event", terms: "Within 30 km of Talek. Paid directly to the group.", languages: ["Maa", "Swahili", "English"], years: 12, specialties: ["Boma dinners", "Weddings", "School groups"], checks: ARTIST_CHECKS, image: IMG.maasaiShuka, demo: true },
  { id: "mara-a2", hub: "mara", category: "Local artists", name: "Naserian Beadwork Lessons (demo)", base: "Talek", headline: "Learn Maasai beadwork from the women's group", about: "Two-hour hands-on lesson in colour meanings and patterns. You leave with the bracelet you make.", offer: "Up to 8 learners · materials included", rate: 6000, unit: "per session", terms: "Per group. Held at the village or your camp.", languages: ["Maa", "Swahili"], years: 15, specialties: ["Beadwork", "Family friendly"], checks: ARTIST_CHECKS, image: IMG.maasaiWomen, demo: true },

  // ---------------- Diani & South Coast ----------------
  { id: "dia-d1", hub: "diani", category: "Drivers & vehicles", name: "Ukunda Coast Transfers (demo)", base: "Ukunda", headline: "Airport and Likoni transfers, day hire on the coast", about: "Moi International or Ukunda airstrip to Diani via the Likoni ferry or the Dongo Kundu bypass, plus day trips to Shimba Hills.", offer: "Toyota Noah · 7 seats · air-conditioned", rate: 8500, unit: "per day", terms: "Includes driver and fuel within 80 km. Airport transfer from KES 6,000.", languages: ["Swahili", "English", "Italian"], years: 10, specialties: ["Airport runs", "Shimba Hills", "Shimoni day trip"], checks: DRIVER_CHECKS, image: IMG.dianiPalms, demo: true },
  { id: "dia-d2", hub: "diani", category: "Drivers & vehicles", name: "Shimba 4x4 Safaris (demo)", base: "Diani", headline: "Open 4x4 for Shimba Hills and Tsavo day trips", about: "Game drives in Shimba Hills and long day trips to Tsavo East from the coast.", offer: "Land Cruiser 4x4 · pop-up roof · 6 seats", rate: 20000, unit: "per day", terms: "Includes driver and fuel. Park fees not included.", languages: ["Swahili", "English", "German"], years: 13, specialties: ["Shimba Hills", "Tsavo day trips"], checks: DRIVER_CHECKS, image: IMG.dianiShore, demo: true },
  { id: "dia-g1", hub: "diani", category: "Tour & local guides", name: "Kisite Reef Guides (demo)", base: "Shimoni", headline: "Marine guide for Kisite-Mpunguti and Wasini", about: "Snorkel guiding, dolphin etiquette and the Wasini village walk. Arranges the dhow with licensed captains.", offer: "Snorkel gear included · up to 10 guests", rate: 7000, unit: "per day", terms: "Guide only. Marine park fee and boat billed separately.", languages: ["Swahili", "English"], years: 8, specialties: ["Snorkelling", "Dolphins", "Wasini"], checks: GUIDE_CHECKS, image: IMG.dianiShore, demo: true },
  { id: "dia-g2", hub: "diani", category: "Tour & local guides", name: "Kaya Kinondo Forest Walks (demo)", base: "Kinondo", headline: "Sacred Kaya forest walk with a Digo elder's guide", about: "Walk through the UNESCO-listed sacred forest learning its rules, trees and Colobus monkeys.", offer: "2-hour walk · up to 8 guests", rate: 4000, unit: "per half day", terms: "Per group. Forest entry fee paid on site.", languages: ["Swahili", "English"], years: 6, specialties: ["Culture", "Colobus monkeys", "Medicinal plants"], checks: GUIDE_CHECKS, image: IMG.dianiPalms, demo: true },
  { id: "dia-p1", hub: "diani", category: "Photographers", name: "Salt & Coral Studio (demo)", base: "Diani", headline: "Beach, family and honeymoon shoots", about: "Golden-hour sessions on Diani beach or at your villa. Drone shots where KCAA rules allow.", offer: "1.5-hour shoot · 60 edited photos · drone optional", rate: 15000, unit: "per session", terms: "Drone add-on KES 5,000. Gallery in 72h.", languages: ["English", "Swahili"], years: 6, specialties: ["Honeymoons", "Families", "Drone"], checks: PHOTO_CHECKS, image: IMG.dianiSunset, demo: true },
  { id: "dia-p2", hub: "diani", category: "Photographers", name: "Msambweni Weddings by Amina (demo)", base: "Msambweni", headline: "Destination wedding photographer", about: "Covers beach ceremonies from preparation to first dance with a second shooter.", offer: "Full day · 2 photographers · 400+ photos", rate: 85000, unit: "per event", terms: "Travel within the South Coast included.", languages: ["English", "Swahili", "Arabic"], years: 9, specialties: ["Weddings", "Engagements"], checks: PHOTO_CHECKS, image: IMG.dianiSunset, demo: true },
  { id: "dia-a1", hub: "diani", category: "Local artists", name: "Pwani Taarab Ensemble (demo)", base: "Ukunda", headline: "Live taarab and Swahili coast music", about: "Oud, violin, qanun and voice — the classic sound of the coast for dinners and weddings.", offer: "5 musicians · two 45-minute sets", rate: 35000, unit: "per event", terms: "Sound system included. Within Diani/Ukunda.", languages: ["Swahili", "English"], years: 18, specialties: ["Weddings", "Dinners"], checks: ARTIST_CHECKS, image: IMG.dianiSunset, demo: true },
  { id: "dia-a2", hub: "diani", category: "Local artists", name: "Tinga Colours Painting Class (demo)", base: "Diani", headline: "Learn Tingatinga painting with a local artist", about: "Bright Tingatinga-style painting class on the veranda; take your canvas home.", offer: "2 hours · up to 6 learners · materials included", rate: 7500, unit: "per session", terms: "Per group.", languages: ["Swahili", "English"], years: 11, specialties: ["Painting", "Kids welcome"], checks: ARTIST_CHECKS, image: IMG.dianiPalms, demo: true },

  // ---------------- Tsavo ----------------
  { id: "tsv-d1", hub: "tsavo", category: "Drivers & vehicles", name: "Voi Gate Safari Cars (demo)", base: "Voi", headline: "4x4 with driver for Tsavo East and West", about: "Pick-up at the Voi SGR station or your lodge, then full days in Tsavo East or across to Tsavo West.", offer: "Land Cruiser 4x4 · pop-up roof · 7 seats", rate: 20000, unit: "per day", terms: "Includes driver and fuel. Park fees not included.", languages: ["English", "Swahili", "Taita"], years: 12, specialties: ["SGR pick-ups", "Tsavo East", "Mzima Springs"], checks: DRIVER_CHECKS, image: IMG.tsavoElephants, demo: true },
  { id: "tsv-d2", hub: "tsavo", category: "Drivers & vehicles", name: "Taita Hills Shuttle (demo)", base: "Wundanyi", headline: "Van hire for Taita Hills and Lumo", about: "Comfortable van for the Taita Hills, Lake Jipe and LUMO sanctuary.", offer: "Toyota Hiace · 9 seats", rate: 12000, unit: "per day", terms: "Includes driver and fuel.", languages: ["Swahili", "English", "Taita"], years: 7, specialties: ["Taita Hills", "Lake Jipe"], checks: DRIVER_CHECKS, image: IMG.tsavoElephants, demo: true },
  { id: "tsv-g1", hub: "tsavo", category: "Tour & local guides", name: "Red Elephant Guides (demo)", base: "Voi", headline: "Wildlife guide for Tsavo's red elephants", about: "Joins your vehicle to read the landscape — waterholes, Aruba dam, Lugard Falls and Mudanda Rock.", offer: "Joins your vehicle · full day", rate: 9000, unit: "per day", terms: "Guide only.", languages: ["English", "Swahili"], years: 10, specialties: ["Elephants", "Lugard Falls", "Birding"], checks: GUIDE_CHECKS, image: IMG.tsavoElephants, demo: true },
  { id: "tsv-g2", hub: "tsavo", category: "Tour & local guides", name: "Taita Cloud Forest Walks (demo)", base: "Wundanyi", headline: "Hiking guide in the Taita Hills", about: "Cloud forest walks to see the Taita white-eye and apalis, plus the Mwanda skull caves.", offer: "Half or full day hikes", rate: 5000, unit: "per half day", terms: "Per group of up to 8.", languages: ["Taita", "Swahili", "English"], years: 8, specialties: ["Hiking", "Endemic birds", "Culture"], checks: GUIDE_CHECKS, image: IMG.mountKenyaHike, demo: true },
  { id: "tsv-p1", hub: "tsavo", category: "Photographers", name: "Tsavo Light Photography (demo)", base: "Voi", headline: "Wildlife and landscape photographer", about: "Rides along and shoots elephants, landscapes and your group at sunset.", offer: "Full day · 60+ edited photos", rate: 18000, unit: "per day", terms: "Vehicle not included.", languages: ["English", "Swahili"], years: 5, specialties: ["Wildlife", "Landscapes"], checks: PHOTO_CHECKS, image: IMG.starrySavanna, demo: true },
  { id: "tsv-a1", hub: "tsavo", category: "Local artists", name: "Mwazindika Dancers of Taita (demo)", base: "Wundanyi", headline: "Taita traditional dance and drums", about: "Mwazindika drumming and dance for lodge evenings and groups.", offer: "Troupe of 8–12 · 40 minutes", rate: 12000, unit: "per event", terms: "Within 40 km of Voi.", languages: ["Taita", "Swahili"], years: 20, specialties: ["Lodge evenings", "Schools"], checks: ARTIST_CHECKS, image: IMG.samburuPeople, demo: true },

  // ---------------- Nairobi ----------------
  { id: "nbo-d1", hub: "nairobi", category: "Drivers & vehicles", name: "Wilson Safari Vans (demo)", base: "Wilson Airport", headline: "Pop-up roof van for multi-day safaris", about: "Starts in Nairobi and goes to the Mara, Amboseli, Naivasha or Nakuru. The driver stays with you for the whole trip.", offer: "Toyota Hiace · pop-up roof · 7 seats", rate: 15000, unit: "per day", terms: "Includes driver and fuel. Driver's accommodation is usually provided by camps.", languages: ["English", "Swahili"], years: 15, specialties: ["Multi-day safaris", "Nairobi National Park"], checks: DRIVER_CHECKS, image: IMG.nairobiParkZebra, demo: true },
  { id: "nbo-d2", hub: "nairobi", category: "Drivers & vehicles", name: "JKIA City Chauffeurs (demo)", base: "Westlands", headline: "Airport pick-ups and city driving", about: "Meet-and-greet at JKIA with a name board, then city errands or a day in Karen.", offer: "Toyota Prado or saloon · 4 seats", rate: 4500, unit: "per transfer", terms: "JKIA ↔ Westlands. Full day from KES 9,000.", languages: ["English", "Swahili", "French"], years: 9, specialties: ["Airport", "Business travel", "Karen day out"], checks: DRIVER_CHECKS, image: IMG.nairobiNight, demo: true },
  { id: "nbo-g1", hub: "nairobi", category: "Tour & local guides", name: "Kibra Food & Life Walks (demo)", base: "Kibra", headline: "Community walk with a guide who grew up here", about: "Walk with a guide from the neighbourhood. You meet artisans and taste food from local kitchens.", offer: "3 hours · up to 8 guests", rate: 6000, unit: "per half day", terms: "Per group. Tastings included.", languages: ["English", "Swahili", "Luo"], years: 6, specialties: ["Food", "Community", "Street art"], checks: GUIDE_CHECKS, image: IMG.nairobiNight, demo: true },
  { id: "nbo-g2", hub: "nairobi", category: "Tour & local guides", name: "Nairobi Heritage Walks (demo)", base: "CBD", headline: "Downtown history and architecture walk", about: "Covers the railway, KICC, the Kenya National Archives and the stories behind the old buildings.", offer: "2.5 hours · up to 10 guests", rate: 5000, unit: "per half day", terms: "Per group. Entry tickets extra.", languages: ["English", "Swahili", "German"], years: 12, specialties: ["History", "Architecture"], checks: GUIDE_CHECKS, image: IMG.nairobiSkyline, demo: true },
  { id: "nbo-p1", hub: "nairobi", category: "Photographers", name: "Lens of the City (demo)", base: "Westlands", headline: "City, portrait and travel photographer", about: "Sessions on rooftops, in markets or at the Giraffe Centre. Can also cover events.", offer: "2-hour shoot · 50 edited photos", rate: 12000, unit: "per session", terms: "Within Nairobi. Gallery in 48h.", languages: ["English", "Swahili"], years: 8, specialties: ["Portraits", "Couples", "Events"], checks: PHOTO_CHECKS, image: IMG.nairobiParkGiraffe, demo: true },
  { id: "nbo-a1", hub: "nairobi", category: "Local artists", name: "GoDown Mural Workshops (demo)", base: "Industrial Area", headline: "Street-art workshop with a Nairobi muralist", about: "Learn stencils and spray techniques and paint a section of a legal practice wall.", offer: "3 hours · up to 10 learners · paint included", rate: 9000, unit: "per session", terms: "Per group.", languages: ["English", "Swahili", "Sheng"], years: 10, specialties: ["Street art", "Team building"], checks: ARTIST_CHECKS, image: IMG.nairobiSkyline, demo: true },
  { id: "nbo-a2", hub: "nairobi", category: "Local artists", name: "Benga Nights Band (demo)", base: "Kilimani", headline: "Live benga and Afro-fusion band", about: "Kenyan classics and Afro-fusion for dinners, private parties and weddings.", offer: "4–6 musicians · up to 3 hours", rate: 45000, unit: "per event", terms: "Sound system included within Nairobi.", languages: ["Swahili", "English", "Luo"], years: 16, specialties: ["Weddings", "Corporate", "Dinners"], checks: ARTIST_CHECKS, image: IMG.nairobiNight, demo: true },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<string, Provider>;
