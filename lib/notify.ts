import { getDb, schema } from "./db";
import { newId } from "./db/ids";

/** In-app notification (bell). Never throws — notifications are best-effort. */
export async function notify(userId: string | null | undefined, type: string, text: string, href = "", actorId?: string) {
  if (!userId || userId === actorId) return;
  try {
    const db = await getDb();
    await db.insert(schema.notifications).values({ id: newId("n_"), userId, actorId: actorId ?? null, type, text: text.slice(0, 200), href });
  } catch (e) {
    console.error("[notify]", e);
  }
}

/** Adds a step to an order's tracking timeline. */
export async function track(orderId: string, status: string, title: string, note = "", location = "") {
  try {
    const db = await getDb();
    await db.insert(schema.shipmentEvents).values({ id: newId("se_"), orderId, status, title, note, location });
  } catch (e) {
    console.error("[track]", e);
  }
}

/** Tells every admin (bell notification) that something is waiting in the approvals inbox. */
export async function notifyAdmins(type: string, text: string, href = "/admin/approvals") {
  try {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const admins = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin"));
    await Promise.all(admins.map((a) => notify(a.id, type, text, href)));
  } catch (e) {
    console.error("[notifyAdmins]", e);
  }
}
