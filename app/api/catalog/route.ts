import { handler, json } from "@/lib/api";
import { affiliatesEnabled, catalogFor } from "@/lib/catalog";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/catalog?places=maasai-mara,diani: everything bookable at these stops, from every source. */
export const GET = handler(async (req: Request) => {
  await requireUser();
  const places = (new URL(req.url).searchParams.get("places") || "").split(",").filter(Boolean).slice(0, 10);
  return json({ items: await catalogFor(places), affiliates: affiliatesEnabled() });
});
