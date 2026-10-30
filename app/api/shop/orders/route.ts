import { and, desc, eq, inArray } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { KENYA_COUNTIES, PICKUP_STATIONS } from "@/lib/data/shop";
import { deliveryFee, deliveryWindow } from "@/lib/delivery";
import { track } from "@/lib/notify";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { startPayment } from "@/lib/payments";
import { HttpError, currentUser, requireUser } from "@/lib/session";
import { commissionFor, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** My orders, or one (?id=) with its items — used for the order page and payment polling. */
export const GET = handler(async (req: Request) => {
  const me = await currentUser();
  if (!me) return json({ orders: [] });
  const db = await getDb();
  const id = new URL(req.url).searchParams.get("id");
  const orders = await db
    .select()
    .from(s.orders)
    .where(id ? and(eq(s.orders.id, id), eq(s.orders.userId, me.id)) : eq(s.orders.userId, me.id))
    .orderBy(desc(s.orders.createdAt))
    .limit(50);
  if (id && !orders[0]) throw new HttpError(404, "Order not found");
  const items = orders.length ? await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, orders.map((o) => o.id))) : [];
  const out = orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id).map(({ commission, commissionRate, vendorAmount, ...rest }) => rest) }));
  return json(id ? { order: out[0] } : { orders: out });
});

/**
 * Place an order and start the M-Pesa payment. Prices, stock and the commission split
 * are all worked out here on the server from the database.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ items?: { productId: string; qty: number; date?: string; note?: string }[]; name?: string; phone?: string; county?: string; town?: string; details?: string; method?: string; station?: string }>(req);
  const phone = normalizePhone(String(b.phone || ""));
  if (!phone) throw new HttpError(400, "Enter a valid Safaricom number, e.g. 0712 345 678.");
  const wanted = (b.items ?? []).filter((i) => i && typeof i.productId === "string").slice(0, 30);
  if (!wanted.length) throw new HttpError(400, "Your cart is empty.");

  const db = await getDb();
  const settings = await getSettings();
  const rows = await db
    .select({ p: s.products, v: s.vendors })
    .from(s.products)
    .innerJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
    .where(inArray(s.products.id, wanted.map((w) => w.productId)));

  const orderId = newId("ord_");
  const lines: (typeof s.orderItems.$inferInsert)[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const w of wanted) {
    const row = rows.find((r) => r.p.id === w.productId);
    if (!row || row.p.status !== "active" || row.v.status !== "verified") throw new HttpError(409, "An item in your cart is no longer available.");
    const service = row.p.kind === "service";
    const qty = Math.min(service ? 30 : 20, Math.max(1, Math.round(Number(w.qty) || 1)));
    if (!service && row.p.stock < qty) throw new HttpError(409, `Only ${row.p.stock} left of "${row.p.title}".`);
    const date = service ? String(w.date || "") : null;
    if (service && (!/^\d{4}-\d{2}-\d{2}$/.test(date!) || date! <= today)) throw new HttpError(400, `Pick a future date for "${row.p.title}".`);
    const lineTotal = row.p.price * qty;
    const rate = commissionFor(settings, service ? row.p.serviceType ?? row.p.category : row.p.category, row.v.commissionRate);
    const commission = Math.round(lineTotal * rate);
    lines.push({
      id: newId("oi_"),
      orderId,
      productId: row.p.id,
      vendorId: row.v.id,
      title: row.p.title,
      image: row.p.images[0] ?? null,
      price: row.p.price,
      qty,
      lineTotal,
      commissionRate: rate,
      commission,
      vendorAmount: lineTotal - commission,
      kind: service ? "service" : "product",
      bookingDate: date,
      bookingNote: String(w.note || "").slice(0, 300),
    });
  }
  const physical = lines.filter((l) => l.kind === "product");
  const method: "home" | "pickup" | "none" = !physical.length ? "none" : b.method === "pickup" ? "pickup" : "home";
  let county = String(b.county || "");
  let town = String(b.town || "").trim().slice(0, 80);
  let station: (typeof PICKUP_STATIONS)[number] | undefined;
  if (method === "pickup") {
    station = PICKUP_STATIONS.find((x) => x.id === b.station);
    if (!station) throw new HttpError(400, "Choose a pick-up station.");
    county = station.county;
    town = station.name;
  } else if (method === "home") {
    if (!KENYA_COUNTIES.includes(county)) throw new HttpError(400, "Choose your county.");
    if (!town) throw new HttpError(400, "Add your town or area.");
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const physicalTotal = physical.reduce((a, l) => a + l.lineTotal, 0);
  const fee = method === "none" ? 0 : deliveryFee(settings, county, method, physicalTotal);
  const total = subtotal + fee;
  const commission = lines.reduce((a, l) => a + l.commission, 0);
  const express = physical.length > 0 && physical.every((l) => rows.find((r) => r.p.id === l.productId)?.p.fulfilledBy === "tembea");
  const eta = method === "none" ? null : deliveryWindow(county, express);

  await db.insert(s.orders).values({
    id: orderId,
    userId: me.id,
    buyerName: String(b.name || me.name || "Customer").slice(0, 80),
    phone,
    address: { county: county || "—", town: town || "—", details: String(b.details || "").slice(0, 300) },
    subtotal,
    deliveryFee: fee,
    total,
    commission,
    deliveryMethod: method,
    pickupStation: station?.id ?? null,
    trackingNumber: method === "none" ? null : `TMB${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    etaFrom: eta?.from ?? null,
    etaTo: eta?.to ?? null,
  });
  await db.insert(s.orderItems).values(lines);
  await track(orderId, "placed", "Order placed", method === "pickup" ? `Collect at ${station!.name}` : "");
  if (!me.phone) await db.update(s.users).set({ phone }).where(eq(s.users.id, me.id));

  const pay = await startPayment({ userId: me.id, purpose: "order", refId: orderId, amount: total, phone, description: `Order ${orderId}` });
  await db.update(s.orders).set({ paymentId: pay.paymentId }).where(eq(s.orders.id, orderId));
  return json({ orderId, total, mode: pay.mode, message: pay.message });
});
