import { and, eq } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { getDb, schema as s } from "@/lib/db";
import { currentUser, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Saved listings ("wishlist"): GET my ids, POST {id} to toggle. */
export const GET = handler(async () => {
  const me = await currentUser();
  if (!me) return json({ ids: [] });
  const db = await getDb();
  const rows = await db.select({ id: s.wishlist.productId }).from(s.wishlist).where(eq(s.wishlist.userId, me.id));
  return json({ ids: rows.map((r) => r.id) });
});

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { id } = await body<{ id?: string }>(req);
  const db = await getDb();
  const pid = String(id || "");
  const has = (await db.select().from(s.wishlist).where(and(eq(s.wishlist.userId, me.id), eq(s.wishlist.productId, pid)))).length > 0;
  if (has) await db.delete(s.wishlist).where(and(eq(s.wishlist.userId, me.id), eq(s.wishlist.productId, pid)));
  else await db.insert(s.wishlist).values({ userId: me.id, productId: pid }).onConflictDoNothing();
  return json({ saved: !has });
});
