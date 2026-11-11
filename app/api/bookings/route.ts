import { body, handler, json } from "@/lib/api";
import { createBooking, myBookings, type BookingInput } from "@/lib/bookings";
import { currentUser, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/bookings?trip=ID: my booking requests (optionally for one trip). */
export const GET = handler(async (req: Request) => {
  const me = await currentUser();
  if (!me) return json({ bookings: [] });
  const trip = new URL(req.url).searchParams.get("trip") || undefined;
  const rows = await myBookings(me.id, trip);
  return json({ bookings: rows.map((b) => ({ id: b.id, ref: b.ref, partner: b.partner, title: b.title, startDate: b.startDate, people: b.people, estimateKes: b.estimateKes, status: b.status, createdAt: b.createdAt })) });
});

/** POST /api/bookings: send a booking request to a partner. */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const b = await body<BookingInput>(req);
  return json({ booking: await createBooking(b, me) });
});
