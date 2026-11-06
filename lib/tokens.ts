import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { newId } from "./db/ids";

/** Adds (or with a negative amount, removes) reward tokens and records why. */
export async function grantTokens(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
  if (!amount) return;
  const db = await getDb();
  await db.insert(schema.tokenLedger).values({ id: newId("tok_"), userId, amount, reason, refType: refType ?? null, refId: refId ?? null });
  await db.update(schema.users).set({ tokens: sql`greatest(0, ${schema.users.tokens} + ${amount})` }).where(eq(schema.users.id, userId));
}
