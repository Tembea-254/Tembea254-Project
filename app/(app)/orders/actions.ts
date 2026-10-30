"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { notify, track } from "@/lib/notify";
import { syncOrderStatus } from "@/lib/orders";
import { refreshRatings } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { grantTokens } from "@/lib/tokens";

const str = (f: FormData, k: string, max = 1000) => String(f.get(k) ?? "").trim().slice(0, max);

async function myOrder(userId: string, id: string) {
  const db = await getDb();
  return (await db.select().from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.userId, userId))))[0];
}

/** The buyer confirms the parcel arrived (or the service happened) — this releases the sellers' share for payout. */
export async function confirmReceived(f: FormData) {
  const me = await requireUser();
  const id = str(f, "id");
  const o = await myOrder(me.id, id);
  if (!o || !["paid", "processing", "shipped"].includes(o.status)) return;
  const db = await getDb();
  const only = f.getAll("item").map(String).filter(Boolean);
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id));
  for (const it of items) {
    if (only.length && !only.includes(it.id)) continue;
    if (!["pending", "processing", "shipped"].includes(it.fulfilment)) continue;
    await db.update(s.orderItems).set({ fulfilment: "delivered", updatedAt: new Date() }).where(eq(s.orderItems.id, it.id));
    const v = (await db.select({ userId: s.vendors.userId }).from(s.vendors).where(eq(s.vendors.id, it.vendorId)))[0];
    await notify(v?.userId, "payout", `${it.title} was confirmed by the buyer — your share is now available`, "/vendor/earnings");
  }
  await syncOrderStatus(id);
  const after = (await db.select({ status: s.orders.status }).from(s.orders).where(eq(s.orders.id, id)))[0];
  if (after?.status === "delivered") await track(id, "delivered", "Delivered", "Confirmed by you");
  revalidatePath(`/orders/${id}`);
}

/** Ask for a return within the return window (products only). */
export async function requestReturn(f: FormData) {
  const me = await requireUser();
  const id = str(f, "id");
  const itemId = str(f, "item");
  const reason = str(f, "reason", 400);
  const o = await myOrder(me.id, id);
  if (!o || !reason) return;
  const db = await getDb();
  const settings = await getSettings();
  const it = (await db.select().from(s.orderItems).where(and(eq(s.orderItems.id, itemId), eq(s.orderItems.orderId, id))))[0];
  if (!it || it.kind !== "product" || it.fulfilment !== "delivered" || it.returnStatus) return;
  if (Date.now() - it.updatedAt.getTime() > settings.returnWindowDays * 86400_000) return;
  await db.update(s.orderItems).set({ returnStatus: "requested", returnReason: reason }).where(eq(s.orderItems.id, itemId));
  await track(id, "return", "Return requested", `${it.title}: ${reason}`);
  revalidatePath(`/orders/${id}`);
}

/** Verified-purchase review: stars + words, rewarded with tokens. */
export async function submitReview(f: FormData) {
  const me = await requireUser();
  const id = str(f, "id");
  const itemId = str(f, "item");
  const rating = Math.min(5, Math.max(1, Math.round(Number(str(f, "rating")) || 0)));
  const text = str(f, "text", 800);
  const o = await myOrder(me.id, id);
  if (!o || !rating) return;
  const db = await getDb();
  const it = (await db.select().from(s.orderItems).where(and(eq(s.orderItems.id, itemId), eq(s.orderItems.orderId, id))))[0];
  if (!it || it.fulfilment !== "delivered" || it.reviewed) return;
  await db.insert(s.productReviews).values({ id: newId("pr_"), productId: it.productId, vendorId: it.vendorId, userId: me.id, orderItemId: it.id, rating, text });
  await db.update(s.orderItems).set({ reviewed: true }).where(eq(s.orderItems.id, it.id));
  await refreshRatings(it.productId, it.vendorId);
  const settings = await getSettings();
  if (text.length >= 20) await grantTokens(me.id, settings.rewardTokensPerReview, `Review: ${it.title}`, "product_review", it.id);
  const v = (await db.select({ userId: s.vendors.userId }).from(s.vendors).where(eq(s.vendors.id, it.vendorId)))[0];
  await notify(v?.userId, "review", `New ${rating}-star review on ${it.title}`, `/marketplace/product/${it.productId}`);
  revalidatePath(`/orders/${id}`);
}

export async function cancelUnpaid(f: FormData) {
  const me = await requireUser();
  const id = str(f, "id");
  const o = await myOrder(me.id, id);
  if (!o || o.status !== "pending_payment") return;
  const db = await getDb();
  await db.update(s.orders).set({ status: "cancelled" }).where(eq(s.orders.id, id));
  await db.update(s.orderItems).set({ fulfilment: "cancelled" }).where(inArray(s.orderItems.orderId, [id]));
  revalidatePath(`/orders/${id}`);
}
