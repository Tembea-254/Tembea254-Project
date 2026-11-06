import { and, desc, eq, sql } from "drizzle-orm";
import { handler, json } from "@/lib/api";
import { getDb, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const me = await currentUser();
  if (!me) return json({ items: [], unread: 0 });
  const db = await getDb();
  const countOnly = new URL(req.url).searchParams.get("count") === "1";
  const unread = (await db.select({ n: sql<number>`count(*)::int` }).from(s.notifications).where(and(eq(s.notifications.userId, me.id), eq(s.notifications.read, false))))[0].n;
  if (countOnly) return json({ unread });
  const items = await db
    .select({ n: s.notifications, actorName: s.users.name, actorImage: s.users.image })
    .from(s.notifications)
    .leftJoin(s.users, eq(s.users.id, s.notifications.actorId))
    .where(eq(s.notifications.userId, me.id))
    .orderBy(desc(s.notifications.createdAt))
    .limit(60);
  return json({ unread, items: items.map(({ n, actorName, actorImage }) => ({ id: n.id, type: n.type, text: n.text, href: n.href, read: n.read, actorName, actorImage, createdAt: n.createdAt.getTime() })) });
});

/** Mark everything read. */
export const POST = handler(async () => {
  const me = await currentUser();
  if (!me) return json({ ok: true });
  const db = await getDb();
  await db.update(s.notifications).set({ read: true }).where(and(eq(s.notifications.userId, me.id), eq(s.notifications.read, false)));
  return json({ ok: true });
});
