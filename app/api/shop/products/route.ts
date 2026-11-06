import { handler, json } from "@/lib/api";
import { listProducts } from "@/lib/repo/shop";

export const dynamic = "force-dynamic";

/** Live product details for the cart (?ids=a,b,c). */
export const GET = handler(async (req: Request) => {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 50);
  return json({ products: ids.length ? await listProducts({ ids }) : [] });
});
