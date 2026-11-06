import { eq } from "drizzle-orm";
import { getDb, schema as s } from "./db";

/** Roll item fulfilment up into the order status (processing → shipped → delivered). */
export async function syncOrderStatus(orderId: string) {
  const db = await getDb();
  const o = (await db.select().from(s.orders).where(eq(s.orders.id, orderId)))[0];
  if (!o || ["pending_payment", "cancelled", "refunded"].includes(o.status)) return;
  const items = (await db.select({ f: s.orderItems.fulfilment }).from(s.orderItems).where(eq(s.orderItems.orderId, orderId))).map((r) => r.f).filter((f) => f !== "cancelled");
  if (!items.length) return;
  const next = items.every((f) => f === "delivered") ? "delivered" : items.every((f) => f === "shipped" || f === "delivered") ? "shipped" : items.some((f) => f !== "pending") ? "processing" : "paid";
  if (next !== o.status) await db.update(s.orders).set({ status: next }).where(eq(s.orders.id, orderId));
}
