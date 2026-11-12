import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

type PlanFields = { plan: string; proUntil: Date | null } | null | undefined;

/** Premium is the "pro" plan while it hasn't run out (no end date = given by an admin). */
export function isPro(u: PlanFields) {
  return !!u && u.plan === "pro" && (!u.proUntil || new Date(u.proUntil).getTime() > Date.now());
}

/** Adds a paid Premium month, starting from today or from the current end date if still active. */
export async function grantPremiumMonth(userId: string) {
  const db = await getDb();
  const u = (await db.select({ plan: schema.users.plan, proUntil: schema.users.proUntil }).from(schema.users).where(eq(schema.users.id, userId)))[0];
  if (!u) return;
  if (u.plan === "pro" && !u.proUntil) return; // already Premium with no end date
  const from = u.proUntil && new Date(u.proUntil).getTime() > Date.now() ? new Date(u.proUntil) : new Date();
  const until = new Date(from.getTime() + 30 * 24 * 3600_000);
  await db.update(schema.users).set({ plan: "pro", proUntil: until }).where(eq(schema.users.id, userId));
}
