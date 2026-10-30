import { eq } from "drizzle-orm";
import { notify, track } from "./notify";
import { getDb, schema } from "./db";
import { newId } from "./db/ids";
import { stkPush } from "./mpesa";

/**
 * Starts an M-Pesa payment for an order or hire deposit and records it.
 * Without MPESA_* keys it runs in demo mode: the payment is marked paid immediately.
 */
export async function startPayment(p: { userId: string; purpose: "order" | "hire_deposit"; refId: string; amount: number; phone: string; description: string }) {
  const db = await getDb();
  const id = newId("pay_");
  const r = await stkPush(p.phone, p.amount, "Tembea254", p.description);
  await db.insert(schema.payments).values({
    id,
    userId: p.userId,
    purpose: p.purpose,
    refId: p.refId,
    amount: p.amount,
    phone: p.phone,
    method: r.mode === "demo" ? "demo" : "mpesa",
    status: "pending",
    checkoutRequestId: r.mode === "daraja" ? r.checkoutRequestId : null,
    message: r.message,
  });
  if (r.mode === "demo") await settlePayment(id, true, "Demo payment (no money moved)");
  return { paymentId: id, mode: r.mode, message: r.message };
}

/** Marks a payment paid/failed and updates whatever it paid for. */
export async function settlePayment(paymentId: string, ok: boolean, message?: string, receipt?: string) {
  const db = await getDb();
  const pay = (await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId)))[0];
  if (!pay || pay.status === "paid") return;
  await db
    .update(schema.payments)
    .set({ status: ok ? "paid" : "failed", message: message ?? pay.message, receipt: receipt ?? null, paidAt: ok ? new Date() : null })
    .where(eq(schema.payments.id, paymentId));
  if (pay.purpose === "order") {
    if (ok) {
      await db.update(schema.orders).set({ status: "paid", paidAt: new Date() }).where(eq(schema.orders.id, pay.refId));
      const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, pay.refId));
      const notified = new Set<string>();
      for (const it of items) {
        const p = (await db.select().from(schema.products).where(eq(schema.products.id, it.productId)))[0];
        if (p) await db.update(schema.products).set({ stock: p.kind === "service" ? p.stock : Math.max(0, p.stock - it.qty), salesCount: p.salesCount + it.qty }).where(eq(schema.products.id, p.id));
        if (!notified.has(it.vendorId)) {
          notified.add(it.vendorId);
          const v = (await db.select({ userId: schema.vendors.userId }).from(schema.vendors).where(eq(schema.vendors.id, it.vendorId)))[0];
          await notify(v?.userId, "order", it.kind === "service" ? `New booking: ${it.title} on ${it.bookingDate}` : `New order: ${it.qty} × ${it.title} — pack it within 48 hours`, "/vendor/orders");
        }
      }
      await track(pay.refId, "paid", "Payment confirmed", receipt ? `M-Pesa ${receipt}` : "");
    }
  } else if (pay.purpose === "hire_deposit") {
    await db.update(schema.hires).set({ status: ok ? "deposit-paid" : "requested" }).where(eq(schema.hires.id, pay.refId));
  }
}

export async function settleByCheckoutId(checkoutRequestId: string, ok: boolean, message?: string, receipt?: string) {
  const db = await getDb();
  const pay = (await db.select().from(schema.payments).where(eq(schema.payments.checkoutRequestId, checkoutRequestId)))[0];
  if (pay) await settlePayment(pay.id, ok, message, receipt);
}
