import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema as s } from "../db";

export type Gig = typeof s.gigs.$inferSelect;
export type Claim = typeof s.gigClaims.$inferSelect;

export const GIG_KIND_LABEL: Record<string, string> = { record: "Video", record360: "360° video", live: "Live walk", photos: "Photos" };
export const CLAIM_LABEL: Record<string, string> = {
  claimed: "Reserved for you",
  submitted: "Pending review",
  approved: "Approved, payment on the way",
  paid: "Paid",
  rejected: "Not approved",
  dropped: "Released",
};

/** Claims that never got a submission go back on the board after the reservation window. */
export async function releaseExpiredClaims(hours: number) {
  const db = await getDb();
  await db
    .update(s.gigClaims)
    .set({ status: "dropped" })
    .where(and(eq(s.gigClaims.status, "claimed"), lt(s.gigClaims.claimedAt, new Date(Date.now() - hours * 3600_000))));
}

/** Slots already taken on each gig (reserved, waiting for review, or approved). */
export async function takenSlots(gigIds: string[]) {
  if (!gigIds.length) return {} as Record<string, number>;
  const db = await getDb();
  const rows = await db
    .select({ gigId: s.gigClaims.gigId, n: sql<number>`count(*)::int` })
    .from(s.gigClaims)
    .where(and(inArray(s.gigClaims.gigId, gigIds), inArray(s.gigClaims.status, ["claimed", "submitted", "approved", "paid"])))
    .groupBy(s.gigClaims.gigId);
  return Object.fromEntries(rows.map((r) => [r.gigId, r.n])) as Record<string, number>;
}

export async function getScout(userId: string) {
  const db = await getDb();
  return (await db.select().from(s.scoutProfiles).where(eq(s.scoutProfiles.userId, userId)))[0];
}

export async function openGigs() {
  const db = await getDb();
  const gigs = await db.select().from(s.gigs).where(eq(s.gigs.status, "open")).orderBy(desc(s.gigs.payKes));
  const taken = await takenSlots(gigs.map((g) => g.id));
  return gigs.map((g) => ({ ...g, left: Math.max(0, g.slots - (taken[g.id] ?? 0)) }));
}

export async function myClaims(userId: string) {
  const db = await getDb();
  return db
    .select({ c: s.gigClaims, g: s.gigs })
    .from(s.gigClaims)
    .innerJoin(s.gigs, eq(s.gigs.id, s.gigClaims.gigId))
    .where(eq(s.gigClaims.userId, userId))
    .orderBy(desc(s.gigClaims.claimedAt));
}

/** What the scouts programme has paid and produced: for the dashboard and for funders. */
export async function scoutImpact() {
  const db = await getDb();
  const [paid, scouts, approved, minutes] = await Promise.all([
    db.select({ n: sql<number>`coalesce(sum(${s.payouts.amount}),0)::int` }).from(s.payouts).where(and(eq(s.payouts.payeeType, "scout"), inArray(s.payouts.status, ["approved", "paid"]))),
    db.select({ n: sql<number>`count(*)::int` }).from(s.scoutProfiles),
    db.select({ n: sql<number>`count(*)::int` }).from(s.gigClaims).where(inArray(s.gigClaims.status, ["approved", "paid"])),
    db.select({ n: sql<number>`coalesce(sum(${s.gigClaims.durationSec}),0)::int` }).from(s.gigClaims).where(inArray(s.gigClaims.status, ["approved", "paid"])),
  ]);
  return { paidKes: paid[0].n, scouts: scouts[0].n, approved: approved[0].n, minutes: Math.round(minutes[0].n / 60) };
}

/** Money a scout has been paid, and money approved but not yet sent. */
export async function scoutEarnings(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ status: s.payouts.status, n: sql<number>`coalesce(sum(${s.payouts.amount}),0)::int` })
    .from(s.payouts)
    .where(and(eq(s.payouts.userId, userId), eq(s.payouts.payeeType, "scout"), inArray(s.payouts.status, ["requested", "approved", "paid"])))
    .groupBy(s.payouts.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  return { paid: by.paid ?? 0, pending: (by.approved ?? 0) + (by.requested ?? 0) };
}
