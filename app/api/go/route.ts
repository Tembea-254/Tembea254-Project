import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/go?ad=ID or /api/go?offer=ID
 * Counts the click (that's what partners pay for) and sends the traveller on to the partner's page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const db = await getDb();
  let dest = "/partners";
  const adId = url.searchParams.get("ad");
  const offerId = url.searchParams.get("offer");
  try {
    if (adId) {
      const ad = (await db.update(s.ads).set({ clicks: sql`${s.ads.clicks} + 1` }).where(eq(s.ads.id, adId)).returning({ url: s.ads.url }))[0];
      if (ad?.url) dest = ad.url;
    } else if (offerId) {
      const o = (await db.update(s.partnerOffers).set({ clicks: sql`${s.partnerOffers.clicks} + 1` }).where(eq(s.partnerOffers.id, offerId)).returning({ url: s.partnerOffers.url }))[0];
      if (o?.url) dest = o.url;
    }
  } catch (e) {
    console.error("[go]", e);
  }
  // only http(s) links or our own pages
  if (!/^https?:\/\//.test(dest) && !(dest.startsWith("/") && !dest.startsWith("//"))) dest = "/partners";
  return NextResponse.redirect(new URL(dest, url.origin), 302);
}
