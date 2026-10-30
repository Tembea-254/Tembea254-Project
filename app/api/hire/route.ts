import { and, desc, eq } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { startPayment } from "@/lib/payments";
import { HttpError, currentUser, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Row = typeof schema.hires.$inferSelect;
const view = (h: Row, message?: string) => ({ id: h.id, providerId: h.providerId, providerName: h.providerName, start: h.start, units: h.units, people: h.people, total: h.total, deposit: h.deposit, status: h.status, message, createdAt: h.createdAt.getTime() });

/** My hire requests, or one by ?id= (used to poll a deposit). */
export const GET = handler(async (req: Request) => {
  const user = await currentUser();
  if (!user) return json({ hires: [] });
  const db = await getDb();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const h = (await db.select().from(schema.hires).where(and(eq(schema.hires.id, id), eq(schema.hires.userId, user.id))))[0];
    if (!h) throw new HttpError(404, "Not found");
    return json({ hire: view(h) });
  }
  const rows = await db.select().from(schema.hires).where(eq(schema.hires.userId, user.id)).orderBy(desc(schema.hires.createdAt));
  return json({ hires: rows.map((h) => view(h)) });
});

/** Request to hire a provider in advance; optionally pay the deposit by M-Pesa. Prices come from the database. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req);
  const db = await getDb();
  const p = (await db.select().from(schema.providers).where(eq(schema.providers.id, String(b.providerId))))[0];
  if (!p || p.status !== "active") throw new HttpError(404, "Provider not found.");
  const start = String(b.start || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || new Date(start + "T23:59:59") < new Date()) throw new HttpError(400, "Choose a date from today onwards.");
  const phone = normalizePhone(String(b.phone || ""));
  if (!phone) throw new HttpError(400, "Enter a valid Safaricom number, e.g. 0712 345 678.");
  const units = Math.min(30, Math.max(1, Math.round(Number(b.units) || 1)));
  const people = Math.min(60, Math.max(1, Math.round(Number(b.people) || 1)));
  const settings = await getSettings();
  const total = p.rate * units;
  const deposit = Math.ceil((total * settings.hireDepositRate) / 100) * 100;
  const id = newId("h_");
  await db.insert(schema.hires).values({ id, userId: user.id, providerId: p.id, providerName: p.name, start, units, people, pickup: String(b.pickup || "").slice(0, 120), note: String(b.note || "").slice(0, 600), phone, total, deposit });
  let message = "Request sent — the provider confirms availability, usually within a few hours.";
  if (b.payDeposit) {
    const pay = await startPayment({ userId: user.id, purpose: "hire_deposit", refId: id, amount: deposit, phone, description: `Hire ${id}` });
    await db.update(schema.hires).set({ paymentId: pay.paymentId, status: pay.mode === "demo" ? "deposit-paid" : "deposit-pending" }).where(eq(schema.hires.id, id));
    message = pay.message;
  }
  const h = (await db.select().from(schema.hires).where(eq(schema.hires.id, id)))[0];
  return json({ hire: { ...view(h, message), status: h.status === "deposit-paid" && !b.payDeposit ? h.status : h.status } });
});
