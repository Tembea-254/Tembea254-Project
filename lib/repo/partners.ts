import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "../db";

export interface OfferView {
  id: string;
  title: string;
  kind: "operator" | "stay" | "transport";
  places: string[];
  days: number;
  tier: string;
  pricePerPerson: number;
  /** what the price covers: person | group | vehicle/day | hour | day | package */
  unit: string;
  /** the partner's own booking page, when they have one */
  url: string;
  includes: string[];
  excludes: string[];
  rating: number | null;
  reviews: number;
  partner: { id: string; name: string; blurb: string; sponsored: boolean; demo: boolean; logo: string | null };
}

/** Every active package from an active partner, for the planner's compare-and-book tab. */
export async function activeOffers(): Promise<OfferView[]> {
  const db = await getDb();
  const rows = await db
    .select({ o: s.partnerOffers, p: s.partners })
    .from(s.partnerOffers)
    .innerJoin(s.partners, eq(s.partners.id, s.partnerOffers.partnerId))
    .where(and(eq(s.partnerOffers.active, true), eq(s.partners.active, true)))
    .orderBy(desc(s.partners.sponsored), s.partnerOffers.pricePerPerson);
  return rows.map(({ o, p }) => ({
    id: o.id,
    title: o.title,
    kind: o.kind,
    places: o.places,
    days: o.days,
    tier: o.tier,
    pricePerPerson: o.pricePerPerson,
    unit: o.unit,
    url: /^https?:\/\//.test(o.url) ? o.url : "",
    includes: o.includes,
    excludes: o.excludes,
    rating: o.rating,
    reviews: o.reviews,
    partner: { id: p.id, name: p.name, blurb: p.blurb, sponsored: p.sponsored, demo: p.demo, logo: p.logo },
  }));
}
