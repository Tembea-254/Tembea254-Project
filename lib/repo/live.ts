import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { LiveWalk } from "./live-types";

/** Scheduled and live walks for the next few weeks (shown on the VR page). */
export async function upcomingLiveWalks(): Promise<LiveWalk[]> {
  try {
    const db = await getDb();
    const since = new Date(Date.now() - 3 * 3600_000);
    const rows = await db
      .select({ s: schema.liveSessions, host: schema.users.name })
      .from(schema.liveSessions)
      .leftJoin(schema.users, eq(schema.users.id, schema.liveSessions.hostUserId))
      .where(and(inArray(schema.liveSessions.status, ["scheduled", "live"]), gte(schema.liveSessions.scheduledAt, since)))
      .orderBy(asc(schema.liveSessions.scheduledAt))
      .limit(12);
    return rows.map(({ s, host }) => ({ id: s.id, title: s.title, destination: s.destination, mode: s.mode, scheduledAt: s.scheduledAt.getTime(), durationMin: s.durationMin, streamUrl: s.streamUrl ?? undefined, status: s.status, host: host || "Tembea host" }));
  } catch (e) {
    console.error("[live]", e);
    return [];
  }
}
