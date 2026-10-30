import { and, desc, eq } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import type { Trip } from "@/lib/planner/types";
import { HttpError, currentUser, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The signed-in traveller's trips (so they follow them across devices). */
export const GET = handler(async () => {
  const me = await currentUser();
  if (!me) return json({ trips: [] });
  const db = await getDb();
  const rows = await db.select().from(schema.trips).where(eq(schema.trips.userId, me.id)).orderBy(desc(schema.trips.updatedAt)).limit(100);
  return json({ trips: rows.map((r) => r.data) });
});

/** Save (upsert) or delete a trip. Body: { trip } or { deleteId }. */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ trip?: Trip; deleteId?: string }>(req);
  const db = await getDb();
  if (b.deleteId) {
    await db.delete(schema.trips).where(and(eq(schema.trips.id, b.deleteId), eq(schema.trips.userId, me.id)));
    return json({ ok: true });
  }
  const t = b.trip;
  if (!t?.id || typeof t.title !== "string" || !Array.isArray(t.stops) || !Array.isArray(t.days)) throw new HttpError(400, "Invalid trip");
  if (JSON.stringify(t).length > 500_000) throw new HttpError(413, "Trip is too large");
  const existing = (await db.select({ userId: schema.trips.userId }).from(schema.trips).where(eq(schema.trips.id, t.id)))[0];
  if (existing && existing.userId !== me.id) throw new HttpError(403, "Not your trip");
  const values = {
    title: t.title.slice(0, 200),
    stops: t.stops.map((s) => String(s.placeId)).slice(0, 30),
    days: t.days.length,
    travelers: Number(t.travelers) || 1,
    totalKes: Math.round(Object.values(t.planned || {}).reduce((a, b) => a + (Number(b) || 0), 0)),
    startDate: t.startDate ?? null,
    source: t.source === "ai" ? "ai" : "engine",
    data: t,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.trips)
    .values({ id: t.id, userId: me.id, ...values, createdAt: new Date(t.createdAt || Date.now()) })
    .onConflictDoUpdate({ target: schema.trips.id, set: values });
  return json({ ok: true });
});
