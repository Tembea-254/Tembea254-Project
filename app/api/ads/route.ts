import { and, eq, inArray, sql } from "drizzle-orm";
import { handler, json } from "@/lib/api";
import { getDb, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { isPro } from "@/lib/premium";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads?placement=planner&exclude=ad_1
 * The next sponsored card and how long to wait before showing another one:
 * free plan every ~20 s, Pro about once an hour (both set in /admin/settings).
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const placement = (url.searchParams.get("placement") || "all").slice(0, 20);
  const exclude = url.searchParams.get("exclude") || "";
  const [me, settings] = await Promise.all([currentUser().catch(() => null), getSettings()]);
  // Premium comes from the account only (a paid month or an admin grant), never from the browser
  const pro = isPro(me as { plan: string; proUntil: Date | null } | null);
  const intervalSec = pro ? settings.adIntervalProSec : settings.adIntervalFreeSec;
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(s.ads)
    .where(and(eq(s.ads.active, true), inArray(s.ads.placement, ["all", placement]), sql`(${s.ads.startsAt} is null or ${s.ads.startsAt} <= ${now})`, sql`(${s.ads.endsAt} is null or ${s.ads.endsAt} >= ${now})`));
  // Pro members don't need to be told to go Pro
  const pool = rows.filter((a) => a.id !== exclude && !(pro && a.url.startsWith("/profile")));
  const ad = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (ad) await db.update(s.ads).set({ impressions: sql`${s.ads.impressions} + 1` }).where(eq(s.ads.id, ad.id));
  return json({
    intervalSec,
    pro,
    ad: ad && { id: ad.id, headline: ad.headline, body: ad.body, image: ad.image, cta: ad.cta, sponsor: ad.partnerId ? "Sponsored" : "From Tembea" },
  });
});
