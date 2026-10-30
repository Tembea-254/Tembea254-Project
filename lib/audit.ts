import { getDb, schema } from "./db";
import { newId } from "./db/ids";

/** Records an admin action in the activity log. */
export async function audit(actor: { id: string; email: string }, action: string, target?: string, meta?: Record<string, unknown>) {
  try {
    const db = await getDb();
    await db.insert(schema.auditLogs).values({ id: newId("log_"), actorId: actor.id, actorEmail: actor.email, action, target: target ?? null, meta: meta ?? null });
  } catch (e) {
    console.error("[audit]", e);
  }
}
