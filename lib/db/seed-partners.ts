import { IMG } from "../data/images";
import type { DB } from "./index";
import * as s from "./schema";

/**
 * Sample partners, packages, ads and Scout gigs so the comparison, ads and Scouts board work on day one.
 * Every sample partner is fictional and flagged `demo`: the app labels it "Sample listing".
 * Real operators (Bonfire Adventures and others) are added from /admin/partners once they sign up,
 * with their own packages, prices and links.
 */
export async function seedPartners(db: DB) {
  const partners: (typeof s.partners.$inferInsert)[] = [
    { id: "pt_savanna", name: "Savanna Trails Safaris", kind: "operator", blurb: "Budget group-joining safaris from Nairobi in pop-up roof vans.", website: "", demo: true, commission: 0.08 },
    { id: "pt_riftreef", name: "Rift & Reef Tours", kind: "operator", blurb: "Mid-range private and small-group safaris across the Rift Valley and the coast.", website: "", demo: true, sponsored: true, commission: 0.1 },
    { id: "pt_coast", name: "Coastline Escapes", kind: "operator", blurb: "Beach holidays and Tsavo safaris from Mombasa and Diani.", website: "", demo: true, commission: 0.08 },
    { id: "pt_bigfive", name: "Big Five Luxury Journeys", kind: "operator", blurb: "Fly-in luxury safaris with private guides.", website: "", demo: true, commission: 0.12 },
    { id: "pt_jambocar", name: "Jambo 4x4 Hire", kind: "transport", blurb: "Land Cruisers with driver-guides, and self-drive 4x4s.", website: "", demo: true, commission: 0.07 },
  ];
  for (const p of partners) await db.insert(s.partners).values(p).onConflictDoNothing();

  const O = (o: typeof s.partnerOffers.$inferInsert) => o;
  const offers = [
    O({ id: "of_sav_mara3", partnerId: "pt_savanna", title: "3-day Maasai Mara group safari", kind: "operator", places: ["maasai-mara"], days: 3, tier: "budget", pricePerPerson: 38000, includes: ["Return transport from Nairobi (pop-up roof van)", "Park fees", "2 nights tented camp, full board", "Game drives", "Driver-guide"], excludes: ["Balloon safari", "Drinks", "Tips"], rating: 4.4, reviews: 312 }),
    O({ id: "of_sav_nak2", partnerId: "pt_savanna", title: "2-day Lake Nakuru & Naivasha", kind: "operator", places: ["lake-nakuru", "naivasha"], days: 2, tier: "budget", pricePerPerson: 26000, includes: ["Transport from Nairobi", "Park fees", "1 night lodge, full board", "Boat ride on Naivasha"], excludes: ["Drinks", "Tips"], rating: 4.3, reviews: 141 }),
    O({ id: "of_rr_mara4", partnerId: "pt_riftreef", title: "4-day Mara & Naivasha private safari", kind: "operator", places: ["maasai-mara", "naivasha"], days: 4, tier: "mid", pricePerPerson: 72000, includes: ["Private 4x4 Land Cruiser", "Park fees", "3 nights lodges, full board", "Hippo boat ride", "Airport pick-up"], excludes: ["Balloon safari", "Drinks"], rating: 4.7, reviews: 205 }),
    O({ id: "of_rr_ken7", partnerId: "pt_riftreef", title: "7-day Kenya highlights: Mara, Nakuru, Amboseli", kind: "operator", places: ["nairobi", "maasai-mara", "lake-nakuru", "amboseli"], days: 7, tier: "mid", pricePerPerson: 165000, includes: ["Private 4x4 Land Cruiser", "All park fees", "6 nights lodges, full board", "Nairobi city tour", "Bottled water"], excludes: ["Flights", "Drinks", "Tips"], rating: 4.8, reviews: 96 }),
    O({ id: "of_co_tsavo3", partnerId: "pt_coast", title: "3-day Tsavo East from the coast", kind: "operator", places: ["tsavo-east", "mombasa", "diani"], days: 3, tier: "mid", pricePerPerson: 48000, includes: ["Hotel pick-up in Mombasa or Diani", "Park fees", "2 nights safari lodge, full board", "Game drives"], excludes: ["Drinks", "Tips"], rating: 4.5, reviews: 158 }),
    O({ id: "of_co_dia5", partnerId: "pt_coast", title: "5-day Diani beach & Shimba Hills", kind: "operator", places: ["diani"], days: 5, tier: "mid", pricePerPerson: 55000, includes: ["4 nights beach resort, half board", "Shimba Hills day trip", "Kisite dolphin dhow trip", "Airport transfers"], excludes: ["Flights", "Lunches"], rating: 4.6, reviews: 87 }),
    O({ id: "of_bf_mara3", partnerId: "pt_bigfive", title: "3-day fly-in Mara luxury camp", kind: "operator", places: ["maasai-mara"], days: 3, tier: "luxury", pricePerPerson: 420000, includes: ["Return flights Wilson–Mara", "2 nights luxury tented camp, all-inclusive", "Private game drives", "Park fees"], excludes: ["Balloon safari", "Premium drinks"], rating: 4.9, reviews: 64 }),
    O({ id: "of_bf_ken8", partnerId: "pt_bigfive", title: "8-day private safari: Samburu, Mara, Amboseli", kind: "operator", places: ["samburu", "maasai-mara", "amboseli", "nairobi"], days: 8, tier: "luxury", pricePerPerson: 980000, includes: ["Private guide & vehicle", "Scheduled bush flights", "7 nights luxury camps, all-inclusive", "All park & conservancy fees"], excludes: ["International flights", "Tips"], rating: 4.9, reviews: 41 }),
    O({ id: "of_jc_cruiser", partnerId: "pt_jambocar", title: "Land Cruiser with driver-guide (up to 6)", kind: "transport", places: ["nairobi", "maasai-mara", "amboseli", "lake-nakuru", "naivasha", "samburu", "mount-kenya", "tsavo-east"], days: 1, tier: "mid", pricePerPerson: 18000, includes: ["Pop-up roof 4x4", "Driver-guide", "Fuel", "Unlimited km"], excludes: ["Park fees for driver", "Driver's meals on long trips"], rating: 4.6, reviews: 119 }),
    O({ id: "of_jc_self", partnerId: "pt_jambocar", title: "Self-drive Toyota Prado", kind: "transport", places: ["nairobi", "mombasa", "diani"], days: 1, tier: "budget", pricePerPerson: 11000, includes: ["Comprehensive insurance", "200 km a day"], excludes: ["Fuel", "Park entry for the car"], rating: 4.2, reviews: 77 }),
  ];
  for (const o of offers) await db.insert(s.partnerOffers).values({ ...o, url: o.url ?? "/partners" }).onConflictDoNothing();

  const adsRows: (typeof s.ads.$inferInsert)[] = [
    { id: "ad_rr_mara", partnerId: "pt_riftreef", headline: "4 days Mara & Naivasha, private 4x4", body: "From KES 72,000 per person, full board. Sample listing.", image: IMG.maraMigration, cta: "See the package", url: "/partners", placement: "all" },
    { id: "ad_coast", partnerId: "pt_coast", headline: "Tsavo East from Diani in 3 days", body: "Hotel pick-up, game drives and a lodge night under the stars. Sample listing.", image: IMG.tsavoElephants, cta: "View offer", url: "/partners", placement: "planner" },
    { id: "ad_house_pro", partnerId: null, headline: "Fewer ads with Tembea Pro", body: "Unlimited AI plans, full-length 360° previews, and ads only every few minutes.", image: IMG.maraBalloon, cta: "Go Pro", url: "/profile#premium", placement: "all" },
    { id: "ad_house_list", partnerId: null, headline: "Run a safari company? List it here", body: "Reach travellers at the moment they plan. Pay only when they click.", image: IMG.amboseliKili, cta: "Advertise with us", url: "/partners", placement: "all" },
  ];
  for (const a of adsRows) await db.insert(s.ads).values(a).onConflictDoNothing();

  const days = (n: number) => new Date(Date.now() + n * 86400_000);
  const gigsRows: (typeof s.gigs.$inferInsert)[] = [
    { id: "gig_mara360", title: "Record a 360° game-drive at Maasai Mara", kind: "record360", destination: "maasai-mara", spot: "Talek gate to the Talek river", brief: "Mount the 360° camera on the roof hatch and record the morning game drive, uncut.", requirements: ["30 minutes or more, one continuous take", "360° camera, 4K or better", "Shot between 06:00 and 09:00", "Camera steady: on a roof mount, not handheld", "No faces as the focus without permission"], minMinutes: 30, payKes: 500, rewardTokens: 200, slots: 3, deadline: days(21), cover: IMG.maraMigration },
    { id: "gig_diani", title: "Diani beach sunrise walk", kind: "record", destination: "diani", spot: "Diani Beach, from Leopard Beach to Kongo river", brief: "A slow walk along the tide line at sunrise, phone held at chest height.", requirements: ["20 minutes or more", "1080p or better, landscape", "Phone on a gimbal or held very steady", "Natural sound only, no music"], minMinutes: 20, payKes: 400, rewardTokens: 150, slots: 4, deadline: days(14), cover: IMG.dianiShore },
    { id: "gig_fort", title: "Fort Jesus 360° walk-through", kind: "record360", destination: "fort-jesus", spot: "Main gate, ramparts and the museum courtyard", brief: "Walk the main route visitors take. Pause 20 seconds at each viewpoint.", requirements: ["15 minutes or more", "360° camera", "Shot in daylight", "Follow the visitor route"], minMinutes: 15, payKes: 600, rewardTokens: 200, slots: 2, deadline: days(30), cover: IMG.fortJesus },
    { id: "gig_cbd_live", title: "Live: Nairobi CBD evening walk", kind: "live", destination: "nairobi-city", spot: "Kenyatta Avenue to Jamia Mosque", brief: "Host a live walk for travellers on the app. Talk about what they see and answer questions.", requirements: ["45 minutes live", "Phone with good 4G", "Speak English or Swahili clearly", "Stay on well-lit main streets"], minMinutes: 45, payKes: 800, rewardTokens: 300, slots: 1, scheduledAt: days(3), cover: IMG.nairobiNight },
    { id: "gig_naivasha", title: "Lake Naivasha boat ride", kind: "record", destination: "naivasha", spot: "Fisherman's Camp jetty to Crescent Island", brief: "Record from the bow of the boat. Hippos and fish eagles are the stars.", requirements: ["20 minutes or more", "1080p or better", "Phone kept dry and steady"], minMinutes: 20, payKes: 700, rewardTokens: 200, slots: 2, deadline: days(21), cover: IMG.nakuruLake },
  ];
  for (const g of gigsRows) await db.insert(s.gigs).values(g).onConflictDoNothing();
}
