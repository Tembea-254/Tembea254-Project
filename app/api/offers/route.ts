import { handler, json } from "@/lib/api";
import { activeOffers } from "@/lib/repo/partners";

export const dynamic = "force-dynamic";

/** GET /api/offers: partner packages, stays and transport the planner compares for a trip. */
export const GET = handler(async () => json({ offers: await activeOffers() }));
