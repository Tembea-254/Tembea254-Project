import { handler, json } from "@/lib/api";
import type { Tier } from "@/lib/data/places";
import { liveLocal, livePackages, searchLinks } from "@/lib/live-offers";
import type { Origin } from "@/lib/planner/origin";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/live?type=packages&places=maasai-mara,diani&days=7&travelers=2&budget=mid&from=kenya:nairobi
 * GET /api/live?type=local&place=diani
 * Real offers from operators' sites (AI web search, cached a day) plus search links on the big platforms.
 * Signed-in users only: each fresh search costs money.
 */
export const GET = handler(async (req: Request) => {
  await requireUser();
  const q = new URL(req.url).searchParams;
  const from = (q.get("from") || "abroad").split(":");
  const origin: Origin = from[0] === "kenya" ? { kind: "kenya", city: from[1] || "nairobi" } : { kind: "abroad", country: from[1] || undefined };
  if (q.get("type") === "local") {
    const place = q.get("place") || "";
    return json({ ...(await liveLocal(place)), links: searchLinks(place) });
  }
  const places = (q.get("places") || "").split(",").filter(Boolean).slice(0, 8);
  const budget = (["budget", "mid", "luxury"].includes(q.get("budget") || "") ? q.get("budget") : "mid") as Tier;
  const result = await livePackages({ places, days: Number(q.get("days")) || 7, travelers: Number(q.get("travelers")) || 2, budget, origin });
  return json({ ...result, links: places.flatMap((p) => searchLinks(p).filter((l) => l.kind === "package")) });
});
