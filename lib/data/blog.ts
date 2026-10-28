import { IMG } from "./images";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "Safari" | "Coast" | "City" | "Guides" | "Culture";
  cover: string;
  date: string; // YYYY-MM-DD
  readMins: number;
  author: string;
  sections: { heading?: string; paragraphs: string[]; tips?: string[] }[];
  related?: { label: string; href: string };
}

export const POSTS: BlogPost[] = [
  {
    slug: "when-to-see-the-great-migration",
    title: "When to see the Great Migration in the Maasai Mara",
    excerpt: "The herds, the river crossings and the quieter months most people overlook — how to time your Mara safari.",
    category: "Safari",
    cover: IMG.maraMigration,
    date: "2026-10-20",
    readMins: 5,
    author: "Tembea254 Team",
    related: { label: "Walk the Mara in 360°", href: "/vr/maasai-mara" },
    sections: [
      {
        paragraphs: [
          "The Great Migration is a year-round loop: well over a million wildebeest, with zebras and gazelles, follow the rains between Tanzania's Serengeti and Kenya's Maasai Mara. The part most travellers picture — huge herds on the Mara plains and dramatic river crossings — usually happens in Kenya between July and October.",
        ],
      },
      {
        heading: "Peak season: July to October",
        paragraphs: [
          "This is when the herds are most often in the Mara. Crossings of the Mara River are unpredictable — a herd can gather on the bank for hours and turn back — so plan at least three nights and keep your mornings flexible. Lodges and conservancies book up early for these months.",
        ],
      },
      {
        heading: "Don't overlook January to March",
        paragraphs: [
          "The migration herds are mostly in the southern Serengeti for calving, but the Mara's resident wildlife — lions, cheetahs, leopards, elephants — stays. It's drier, quieter and often cheaper. April and May bring the long rains; some camps close and roads get muddy.",
        ],
      },
      {
        heading: "Make the most of it",
        paragraphs: ["Private conservancies bordering the reserve limit vehicles at sightings and allow walks and night drives that aren't permitted inside the main reserve."],
        tips: ["Book a sunrise balloon flight early — they sell out in peak season", "Pack a warm layer: dawn game drives are cold", "Bring binoculars and a zoom lens; crossings can be far away"],
      },
    ],
  },
  {
    slug: "nairobi-to-mombasa-by-sgr",
    title: "Nairobi to Mombasa on the SGR: a practical guide",
    excerpt: "Booking the Madaraka Express, what to expect on board and how to get from Mombasa to Diani or Watamu.",
    category: "Guides",
    cover: IMG.mombasaSunrise,
    date: "2026-10-14",
    readMins: 4,
    author: "Tembea254 Team",
    related: { label: "Plan a Nairobi–coast trip", href: "/planner" },
    sections: [
      {
        paragraphs: [
          "The Madaraka Express on the Standard Gauge Railway (SGR) links Nairobi Terminus and Mombasa's Miritini terminus in roughly four and a half to six hours, depending on whether you take the express or the inter-county service with more stops. It's the most comfortable way between the capital and the coast, and you often see wildlife as the line passes Tsavo.",
        ],
      },
      {
        heading: "Booking and boarding",
        paragraphs: [
          "Tickets are sold through Kenya Railways' online booking system and can be paid with M-Pesa. You'll need the passenger's ID or passport details. Arrive at least an hour early: there are security screenings before you reach the platform, and luggage limits apply.",
        ],
        tips: ["First class is quieter and has more legroom", "Fares and timetables change — always check the current ones before you travel", "Keep your ID handy; it's checked at boarding"],
      },
      {
        heading: "Onward to Diani, Watamu or Kilifi",
        paragraphs: [
          "From Miritini, south-coast travellers to Diani either cross the Likoni ferry (vehicles and foot passengers) or take the Dongo Kundu bypass road, which avoids the ferry queues. Heading north to Kilifi, Watamu or Malindi, it's a road trip up the coast via the Mtwapa and Kilifi bridges — no ferry needed.",
        ],
      },
    ],
  },
  {
    slug: "things-to-do-in-diani",
    title: "Beyond the beach: the best things to do around Diani",
    excerpt: "Dolphins at Kisite, colobus monkeys, Shimba Hills waterfalls and the kitesurfing seasons explained.",
    category: "Coast",
    cover: IMG.dianiPalms,
    date: "2026-10-08",
    readMins: 5,
    author: "Tembea254 Team",
    related: { label: "Walk Diani Beach in 360°", href: "/vr/diani" },
    sections: [
      {
        paragraphs: [
          "Diani, in Kwale County on Kenya's south coast, is famous for its long white beach — but the best days often start somewhere else. Here's how to fill a week.",
        ],
      },
      {
        heading: "Kisite-Mpunguti Marine Park",
        paragraphs: [
          "Day trips leave from Shimoni by dhow for snorkelling in the marine park, with a good chance of spotting dolphins, and usually include a seafood lunch on Wasini Island. Go on a calm morning for the clearest water.",
        ],
      },
      {
        heading: "Colobus Conservation and Shimba Hills",
        paragraphs: [
          "Colobus Conservation runs guided walks in the coastal forest and explains the 'colobridges' that help monkeys cross the busy Diani road. Inland, Shimba Hills National Reserve has sable antelope, elephants and the short hike to Sheldrick Falls.",
        ],
      },
      {
        heading: "Kitesurfing seasons",
        paragraphs: ["Diani's two trade winds give it two kite seasons: the Kaskazi (roughly December to March) and the Kusi (roughly June to September). Schools offer taster lessons for complete beginners."],
        tips: ["Ukunda airstrip is minutes from the beach", "Respect the reef — don't stand on coral at low tide", "Beach boys can be persistent: a polite, firm 'hapana, asante' works"],
      },
    ],
  },
  {
    slug: "safari-packing-list-kenya",
    title: "What to pack for a Kenyan safari (and what to leave behind)",
    excerpt: "Neutral layers, soft bags for bush flights, the eTA — and the plastic-bag rule that surprises visitors.",
    category: "Guides",
    cover: IMG.amboseliKili,
    date: "2026-09-29",
    readMins: 4,
    author: "Tembea254 Team",
    related: { label: "Build your trip — packing list included", href: "/planner" },
    sections: [
      {
        heading: "Clothes",
        paragraphs: [
          "Choose khaki, olive and beige: they hide dust and don't distract animals. Avoid dark blue and black in tsetse areas. Dawn and evening drives are cold, especially in the Mara and Amboseli, so pack a fleece and a light jacket, plus a hat and sunglasses for midday.",
        ],
      },
      {
        heading: "Bags and bush flights",
        paragraphs: ["Light aircraft to the parks usually limit luggage to around 15 kg, in a soft bag without wheels. Check your airline's exact limit when you book."],
      },
      {
        heading: "Documents and rules",
        paragraphs: [
          "Most visitors need an Electronic Travel Authorisation (eTA) before travelling — apply online well in advance. Kenya banned single-use plastic carrier bags in 2017, and the rule is enforced at airports, so pack toiletries in reusable pouches.",
        ],
        tips: ["Binoculars — one pair per person if you can", "Power bank: some camps have limited charging", "Ask a travel clinic about vaccinations and malaria advice for your route"],
      },
    ],
  },
  {
    slug: "48-hours-in-nairobi",
    title: "48 hours in Nairobi: a safari city weekend",
    excerpt: "Lions before breakfast, baby elephants at 11, giraffes after lunch and rooftop sunsets — a two-day plan.",
    category: "City",
    cover: IMG.nairobiParkGiraffe,
    date: "2026-09-18",
    readMins: 4,
    author: "Tembea254 Team",
    related: { label: "See Nairobi in 360°", href: "/vr/nairobi-city" },
    sections: [
      {
        heading: "Day one",
        paragraphs: [
          "Start early in Nairobi National Park — the only national park inside a capital city — for the best chance of lions and rhinos, with skyscrapers on the horizon. Late morning, visit the Sheldrick Wildlife Trust's elephant nursery (check the current visiting hours and booking rules). After lunch, feed giraffes at the Giraffe Centre in Lang'ata.",
        ],
      },
      {
        heading: "Day two",
        paragraphs: [
          "Visit the Karen Blixen Museum and the Kazuri bead workshop in Karen, then head into town for the Nairobi National Museum. End the day with the view from the KICC rooftop, followed by dinner in Westlands.",
        ],
        tips: ["Traffic is heavy at rush hour — plan cross-town trips outside 7–9am and 5–7pm", "Use ride-hailing apps at night", "Carry some cash for park and museum fees, though most take cards or M-Pesa"],
      },
    ],
  },
  {
    slug: "slow-travel-in-lamu",
    title: "Slow travel in Lamu: a guide to Kenya's Swahili island",
    excerpt: "No cars, carved doors and dhows at sunset — how to visit a UNESCO World Heritage town respectfully.",
    category: "Culture",
    cover: IMG.lamuDhow,
    date: "2026-09-05",
    readMins: 5,
    author: "Tembea254 Team",
    related: { label: "Walk the lanes of Shela in 360°", href: "/vr/lamu" },
    sections: [
      {
        paragraphs: [
          "Lamu Old Town is one of the oldest continuously inhabited Swahili settlements in East Africa and a UNESCO World Heritage Site. There are almost no cars: people get around on foot, by donkey and by boat.",
        ],
      },
      {
        heading: "Getting there",
        paragraphs: ["Most visitors fly to Manda Island and take a short boat ride across the channel to Lamu town or Shela. Boats wait at the airport jetty."],
      },
      {
        heading: "What to do",
        paragraphs: [
          "Wander the lanes and the Lamu Museum, walk or take a boat to Shela's long beach, and sail on a dhow at sunset. If you can, time your visit for the Lamu Cultural Festival, usually held in November, with dhow races and donkey races.",
        ],
        tips: ["Lamu is conservative: cover shoulders and knees in town", "Ask before photographing people", "Bring cash — not every small shop takes cards"],
      },
    ],
  },
  {
    slug: "swahili-phrases-for-travellers",
    title: "12 Swahili phrases every traveller in Kenya should know",
    excerpt: "From 'Jambo' to 'pole pole' — the words that turn transactions into conversations.",
    category: "Culture",
    cover: IMG.maasaiWomen,
    date: "2026-08-27",
    readMins: 3,
    author: "Tembea254 Team",
    related: { label: "Open the translator", href: "/translator" },
    sections: [
      {
        paragraphs: ["English is widely spoken in Kenya, but a few words of Swahili go a long way. Here are the essentials."],
        tips: [
          "Jambo / Habari — Hello / How are you?",
          "Nzuri — Fine, good",
          "Asante (sana) — Thank you (very much)",
          "Karibu — Welcome / You're welcome",
          "Tafadhali — Please",
          "Ndiyo / Hapana — Yes / No",
          "Bei gani? — How much?",
          "Pole pole — Slowly, take it easy",
          "Pole — Sorry (sympathy)",
          "Samahani — Excuse me",
          "Hakuna matata — No problem",
          "Kwaheri — Goodbye",
        ],
      },
    ],
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
