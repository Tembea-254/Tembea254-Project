import { and, desc, eq, sql } from "drizzle-orm";
import { PLACE_BY_ID } from "./data/places";
import { getDb, schema as s } from "./db";
import { newId } from "./db/ids";
import { esc, sendEmail } from "./email";
import { normalizePhone } from "./mpesa";
import { notify, notifyAdmins } from "./notify";
import { HttpError } from "./session";

/**
 * B2B booking requests. A traveller asks a partner (tour operator, lodge, car hire) to book something;
 * the request gets a TB-#### reference, is emailed to the partner and shows in their dashboard.
 * The partner marks it booked with the amount, and Tembea254's commission is worked out from their rate.
 */

export type Booking = typeof s.bookingRequests.$inferSelect;

export const UNIT_LABEL: Record<string, string> = {
  person: "per person",
  group: "per group",
  "vehicle/day": "per vehicle per day",
  hour: "per hour",
  day: "per day",
  package: "per package",
};

/** what a request costs for a group, from the offer's unit price */
export function estimate(price: number, unit: string, people: number, quantity: number) {
  if (unit === "person") return price * people;
  if (unit === "vehicle/day" || unit === "day" || unit === "hour") return price * Math.max(1, quantity) * (unit === "vehicle/day" ? Math.max(1, Math.ceil(people / 6)) : 1);
  return price;
}

async function newRef() {
  const db = await getDb();
  for (let i = 0; i < 8; i++) {
    const ref = `TB-${Math.floor(10000 + Math.random() * 90000)}`;
    const hit = await db.select({ id: s.bookingRequests.id }).from(s.bookingRequests).where(eq(s.bookingRequests.ref, ref)).limit(1);
    if (!hit.length) return ref;
  }
  return `TB-${Date.now().toString(36).toUpperCase()}`;
}

export interface BookingInput {
  offerId: string;
  startDate: string;
  endDate?: string;
  people: number;
  quantity?: number;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  tripId?: string;
}

export async function createBooking(input: BookingInput, user: { id: string; email?: string | null; name?: string | null } | null) {
  const db = await getDb();
  const row = (await db.select({ o: s.partnerOffers, p: s.partners }).from(s.partnerOffers).innerJoin(s.partners, eq(s.partners.id, s.partnerOffers.partnerId)).where(eq(s.partnerOffers.id, String(input.offerId))))[0];
  if (!row || !row.o.active || !row.p.active) throw new HttpError(404, "This offer is no longer available.");
  const name = String(input.name || user?.name || "").trim().slice(0, 80);
  const email = String(input.email || user?.email || "").trim().slice(0, 120);
  const phone = input.phone ? normalizePhone(String(input.phone)) : null;
  if (name.length < 2) throw new HttpError(400, "Tell the partner your name.");
  if (!phone && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Add a phone number or email so the partner can reach you.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || new Date(input.startDate + "T23:59:59") < new Date()) throw new HttpError(400, "Choose a start date from today onwards.");
  const people = Math.min(60, Math.max(1, Math.round(Number(input.people) || 1)));
  const quantity = Math.min(60, Math.max(1, Math.round(Number(input.quantity) || 1)));
  const { o, p } = row;
  const ref = await newRef();
  const id = newId("bk_");
  const est = estimate(o.pricePerPerson, o.unit, people, quantity);
  await db.insert(s.bookingRequests).values({
    id,
    ref,
    userId: user?.id ?? null,
    partnerId: p.id,
    offerId: o.id,
    title: o.title,
    kind: o.kind,
    placeId: o.places[0] ?? null,
    tripId: input.tripId?.slice(0, 40) || null,
    startDate: input.startDate,
    endDate: input.endDate && /^\d{4}-\d{2}-\d{2}$/.test(input.endDate) ? input.endDate : null,
    people,
    quantity,
    estimateKes: est,
    name,
    phone: phone ?? "",
    email,
    note: String(input.note || "").slice(0, 1000),
  });
  // keep the referral trail in one place too
  await db.insert(s.referrals).values({ id: newId("rf_"), provider: p.name, url: `booking:${ref}`, placeId: o.places[0] ?? null, kind: "booking", userId: user?.id ?? null });

  const emailed = await emailPartner(p, { ref, title: o.title, startDate: input.startDate, endDate: input.endDate, people, quantity, unit: o.unit, est, name, phone: phone ?? "", email, note: String(input.note || ""), place: PLACE_BY_ID[o.places[0]]?.name });
  if (emailed) await db.update(s.bookingRequests).set({ emailedAt: new Date() }).where(eq(s.bookingRequests.id, id));
  if (p.ownerEmail) {
    const owner = (await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${p.ownerEmail.toLowerCase()}`))[0];
    if (owner) await notify(owner.id, "booking", `New booking request ${ref}: ${o.title}`, "/partner");
  }
  await notifyAdmins("booking", `Booking request ${ref} for ${p.name}: ${o.title}`, "/admin/partners?tab=bookings");
  if (user) await notify(user.id, "booking", `Request ${ref} sent to ${p.name}. They'll contact you to confirm.`, "/bookings");
  return { id, ref, partner: p.name, emailed, estimateKes: est };
}

async function emailPartner(
  p: typeof s.partners.$inferSelect,
  b: { ref: string; title: string; startDate: string; endDate?: string; people: number; quantity: number; unit: string; est: number; name: string; phone: string; email: string; note: string; place?: string },
) {
  if (!p.email) return false;
  const site = process.env.NEXTAUTH_URL || "https://tembea254-project.vercel.app";
  const lines: [string, string][] = [
    ["Reference", `${b.ref} (via Tembea254)`],
    ["Package / service", b.title],
    ["Where", b.place ?? ""],
    ["Dates", b.endDate ? `${b.startDate} to ${b.endDate}` : b.startDate],
    ["People", String(b.people)],
    ...(b.quantity > 1 ? ([["Quantity", `${b.quantity} (${UNIT_LABEL[b.unit] ?? b.unit})`]] as [string, string][]) : []),
    ["Estimate shown to traveller", `KES ${b.est.toLocaleString("en-KE")}`],
    ["Traveller", b.name],
    ["Phone", b.phone ? `+${b.phone}` : "—"],
    ["Email", b.email || "—"],
    ["Message", b.note || "—"],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
  <h2 style="color:#0E2E24">New booking request from Tembea254</h2>
  <p>A traveller planning their trip on Tembea254 would like to book with ${esc(p.name)}. Please contact them to confirm, and quote reference <b>${esc(b.ref)}</b>.</p>
  <table style="border-collapse:collapse;width:100%">${lines.map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#6B8178">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}</table>
  <p style="margin-top:16px">Mark it as booked in your partner dashboard: <a href="${site}/partner">${site}/partner</a></p>
  <p style="color:#6B8178;font-size:12px">Commission for bookings referred by Tembea254 is ${Math.round(p.commission * 100)}% as agreed.</p></div>`;
  const text = `New booking request from Tembea254\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nPartner dashboard: ${site}/partner`;
  return sendEmail({ to: p.email, subject: `Booking request ${b.ref} via Tembea254: ${b.title}`, html, text, replyTo: b.email || undefined });
}

/** The partner a signed-in user manages (matched on their account email). */
export async function partnerFor(email?: string | null) {
  if (!email) return undefined;
  const db = await getDb();
  return (await db.select().from(s.partners).where(sql`lower(${s.partners.ownerEmail}) = ${email.toLowerCase()}`))[0];
}

export async function bookingsForPartner(partnerId: string) {
  const db = await getDb();
  return db.select().from(s.bookingRequests).where(eq(s.bookingRequests.partnerId, partnerId)).orderBy(desc(s.bookingRequests.createdAt)).limit(200);
}

export async function myBookings(userId: string, tripId?: string) {
  const db = await getDb();
  const rows = await db
    .select({ b: s.bookingRequests, partner: s.partners.name })
    .from(s.bookingRequests)
    .leftJoin(s.partners, eq(s.partners.id, s.bookingRequests.partnerId))
    .where(tripId ? and(eq(s.bookingRequests.userId, userId), eq(s.bookingRequests.tripId, tripId)) : eq(s.bookingRequests.userId, userId))
    .orderBy(desc(s.bookingRequests.createdAt));
  return rows.map(({ b, partner }) => ({ ...b, partner: partner ?? "" }));
}
