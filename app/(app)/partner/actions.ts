"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { partnerFor } from "@/lib/bookings";
import { getDb, schema as s } from "@/lib/db";
import type { BookingStatus } from "@/lib/db/schema";
import { notify } from "@/lib/notify";
import { requireUser } from "@/lib/session";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const back = (kind: "ok" | "error", msg: string): never => redirect(`/partner?${kind}=${encodeURIComponent(msg)}`);

async function mine(f: FormData) {
  const me = await requireUser();
  const partner = await partnerFor(me.email);
  if (!partner) redirect("/partners");
  const db = await getDb();
  const b = (await db.select().from(s.bookingRequests).where(and(eq(s.bookingRequests.id, str(f, "id")), eq(s.bookingRequests.partnerId, partner!.id))))[0];
  if (!b) back("error", "Request not found.");
  return { me, partner: partner!, b: b!, db };
}

/** Accept, decline or cancel a request. The traveller is told. */
export async function setBookingStatus(f: FormData) {
  const { me, partner, b, db } = await mine(f);
  const status = str(f, "status") as BookingStatus;
  if (!["accepted", "declined", "cancelled"].includes(status)) return;
  await db.update(s.bookingRequests).set({ status, partnerNote: str(f, "note") || b.partnerNote, updatedAt: new Date() }).where(eq(s.bookingRequests.id, b.id));
  const text = status === "accepted" ? `${partner.name} accepted ${b.ref} and will contact you to finalise.` : status === "declined" ? `${partner.name} can't take ${b.ref}${str(f, "note") ? `: ${str(f, "note")}` : "."}` : `${b.ref} was cancelled by ${partner.name}.`;
  await notify(b.userId, "booking", text, "/bookings");
  await audit(me, `booking.${status}`, b.id, { ref: b.ref });
  revalidatePath("/partner");
  back("ok", `${b.ref} marked ${status}.`);
}

/** The traveller paid: record the amount. Tembea254's commission comes from the partner's agreed rate. */
export async function markBooked(f: FormData) {
  const { me, partner, b, db } = await mine(f);
  const amount = Math.round(Number(str(f, "amount").replace(/[^\d.]/g, "")) || 0);
  if (amount <= 0) back("error", "Enter the amount the traveller paid.");
  const commission = Math.round(amount * partner.commission);
  await db.update(s.bookingRequests).set({ status: "booked", bookedKes: amount, commissionKes: commission, updatedAt: new Date() }).where(eq(s.bookingRequests.id, b.id));
  await notify(b.userId, "booking", `${b.ref} is booked with ${partner.name}. Have a great trip!`, "/bookings");
  await audit(me, "booking.booked", b.id, { ref: b.ref, amount, commission });
  revalidatePath("/partner");
  back("ok", `${b.ref} booked for KES ${amount.toLocaleString("en-KE")}.`);
}
