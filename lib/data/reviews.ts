export interface Review {
  id: string;
  name: string;
  from: string; // where the traveller is from
  trip: string; // e.g. "10-day Bush & Beach"
  placeImage: string; // Unsplash id
  rating: number; // 1..5
  text: string;
  createdAt: number;
  approved: boolean;
  /** placeholder copy for design previews — never shown in production builds */
  sample?: boolean;
}

/**
 * Design placeholders so the section isn't empty while you collect real reviews.
 * They are tagged "Sample" in development and filtered out of production builds
 * (or whenever NEXT_PUBLIC_SHOW_SAMPLE_REVIEWS=false). Replace with real, consented reviews.
 */
export const SAMPLE_REVIEWS: Review[] = [
  {
    id: "s1",
    name: "Amina",
    from: "Nairobi",
    trip: "Weekend in Diani",
    placeImage: "photo-1633345778967-3760204a4c57",
    rating: 5,
    text: "The planner sorted our SGR tickets, the Likoni ferry crossing and a dhow trip to Kisite in minutes. Walking the beach in 360° first sold my mum on it.",
    createdAt: 0,
    approved: true,
    sample: true,
  },
  {
    id: "s2",
    name: "Tom & Lena",
    from: "Hamburg",
    trip: "10-day Bush & Beach",
    placeImage: "photo-1518459384564-ecfd8e80721f",
    rating: 5,
    text: "We compared three Mara camps side by side — breakfast, cancellation and price per night — and booked the one that fit. The day-by-day map made the route click.",
    createdAt: 0,
    approved: true,
    sample: true,
  },
  {
    id: "s3",
    name: "Kevin",
    from: "Kisumu",
    trip: "Lamu cultural trip",
    placeImage: "photo-1711802536786-149a0d0c5879",
    rating: 4,
    text: "Loved the phrasebook and the WhatsApp PDF — my whole group had the plan with photos before we even left Nairobi.",
    createdAt: 0,
    approved: true,
    sample: true,
  },
  {
    id: "s4",
    name: "Priya",
    from: "London",
    trip: "Family safari",
    placeImage: "photo-1634662101368-fa8021773862",
    rating: 5,
    text: "The accessibility helper made it easy for my dad to read everything. Short drives, early nights — exactly what we asked for.",
    createdAt: 0,
    approved: true,
    sample: true,
  },
];

export const showSampleReviews = () => process.env.NEXT_PUBLIC_SHOW_SAMPLE_REVIEWS !== "false" && process.env.NODE_ENV !== "production";
