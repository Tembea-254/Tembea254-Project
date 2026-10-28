import { IMG } from "@/lib/data/images";
import type { PlanRequest } from "@/lib/planner/types";

/** Stippl-style "recommended routes" — one click turns them into an editable trip. */
export const SAMPLE_ROUTES: {
  id: string;
  title: string;
  stops: string;
  days: number;
  season: string;
  image: string;
  blurb: string;
  request: Partial<PlanRequest>;
}[] = [
  {
    id: "classic-safari",
    title: "Classic safari sampler",
    stops: "Nairobi · Naivasha · Maasai Mara",
    days: 6,
    season: "Jul – Oct",
    image: IMG.maraBalloon,
    blurb: "Giraffes at breakfast, hippos on the lake and big cats in the Mara.",
    request: { prompt: "Classic first safari: Nairobi, Lake Naivasha and the Maasai Mara", days: 6, interests: ["wildlife"], places: ["nairobi", "naivasha", "maasai-mara"] },
  },
  {
    id: "bush-beach",
    title: "Bush & Beach",
    stops: "Nairobi · Maasai Mara · Diani",
    days: 10,
    season: "Dec – Mar",
    image: IMG.dianiPalms,
    blurb: "The honeymoon favourite: game drives, then white sand on the south coast.",
    request: { prompt: "Romantic bush and beach: Maasai Mara safari then Diani beach", days: 10, group: "couple", interests: ["wildlife", "beach", "relax"], places: ["maasai-mara", "diani"] },
  },
  {
    id: "swahili-coast",
    title: "Swahili coast slow trip",
    stops: "Mombasa · Watamu · Lamu",
    days: 8,
    season: "Nov – Mar",
    image: IMG.lamuDhow,
    blurb: "Fort Jesus, turtle rescue, dhow sunsets and car-free Lamu.",
    request: { prompt: "Slow Swahili coast: Mombasa old town, Watamu and Lamu", days: 8, style: "relaxed", interests: ["culture", "beach", "food"], places: ["mombasa", "watamu", "lamu"] },
  },
  {
    id: "giants",
    title: "Giants of the south",
    stops: "Amboseli · Tsavo East · Diani",
    days: 7,
    season: "Jun – Oct",
    image: IMG.amboseliKili,
    blurb: "Elephants under Kilimanjaro, red elephants of Tsavo and the ocean.",
    request: { prompt: "Elephants under Kilimanjaro, Tsavo and the beach", days: 7, interests: ["wildlife", "beach"], places: ["amboseli", "tsavo-east", "diani"] },
  },
  {
    id: "north-adventure",
    title: "Northern adventure",
    stops: "Mt Kenya · Samburu · Lake Nakuru",
    days: 8,
    season: "Jun – Oct",
    image: IMG.samburuElephants,
    blurb: "Rhino sanctuaries, Samburu's Special Five and forest hikes.",
    request: { prompt: "Adventurous north: Mount Kenya hike, Samburu, Lake Nakuru rhinos", days: 8, interests: ["adventure", "wildlife"], places: ["mount-kenya", "samburu", "lake-nakuru"] },
  },
  {
    id: "family",
    title: "Family-friendly Kenya",
    stops: "Nairobi · Naivasha · Mombasa · Diani",
    days: 9,
    season: "School holidays",
    image: IMG.nairobiParkGiraffe,
    blurb: "Baby elephants, boat rides and easy beach days — short drives, early nights.",
    request: { prompt: "Family trip with kids, short drives, wildlife and beach", days: 9, group: "family", travelers: 4, style: "relaxed", interests: ["wildlife", "beach"], places: ["nairobi", "naivasha", "diani"] },
  },
];

export const PROMPT_IDEAS = [
  "10 days: Maasai Mara safari, then Diani beach — couple, mid budget",
  "A week of culture and food on the Swahili coast",
  "Weekend in Nairobi with a game drive and nightlife",
  "2 weeks, everything: wildlife, hiking and beaches",
];
