import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { signUrl, withRef } from "@/lib/live-offers";
import { currentUser } from "@/lib/session";

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
  const out = url.searchParams.get("u");
  // a referral to an operator's own site: only links Tembea254 signed are followed, and each one is recorded
  if (out) {
    if (url.searchParams.get("s") !== signUrl(out) || !/^https:\/\//.test(out)) return NextResponse.redirect(new URL("/planner", url.origin), 302);
    try {
      const me = await currentUser().catch(() => null);
      await db.insert(s.referrals).values({ id: newId("rf_"), provider: (url.searchParams.get("p") || new URL(out).hostname).slice(0, 60), url: out.slice(0, 1000), placeId: url.searchParams.get("pl"), kind: (url.searchParams.get("k") || "package").slice(0, 20), userId: me?.id ?? null });
    } catch (e) {
      console.error("[go] referral", e);
    }
    return NextResponse.redirect(out, 302);
  }
  try {
    if (adId) {
      const ad = (await db.update(s.ads).set({ clicks: sql`${s.ads.clicks} + 1` }).where(eq(s.ads.id, adId)).returning({ url: s.ads.url }))[0];
      if (ad?.url) dest = ad.url;
    } else if (offerId) {
      const o = (await db.update(s.partnerOffers).set({ clicks: sql`${s.partnerOffers.clicks} + 1` }).where(eq(s.partnerOffers.id, offerId)).returning({ url: s.partnerOffers.url, partnerId: s.partnerOffers.partnerId, places: s.partnerOffers.places }))[0];
      if (o?.url) {
        dest = /^https?:\/\//.test(o.url) ? withRef(o.url) : o.url;
        const me = await currentUser().catch(() => null);
        const partner = (await db.select({ name: s.partners.name }).from(s.partners).where(eq(s.partners.id, o.partnerId)))[0];
        await db.insert(s.referrals).values({ id: newId("rf_"), provider: partner?.name ?? o.partnerId, url: dest.slice(0, 1000), placeId: o.places[0] ?? null, kind: "partner", userId: me?.id ?? null });
      }
    }
  } catch (e) {
    console.error("[go]", e);
  }
  // only http(s) links or our own pages
  if (!/^https?:\/\//.test(dest) && !(dest.startsWith("/") && !dest.startsWith("//"))) dest = "/partners";
  return NextResponse.redirect(new URL(dest, url.origin), 302);
}
