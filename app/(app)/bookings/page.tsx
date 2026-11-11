import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarCheck2 } from "lucide-react";
import { Empty, Panel, StatusBadge, kes, when } from "@/components/admin/kit";
import { myBookings } from "@/lib/bookings";
import { getDb, schema as s } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "My bookings" };

const STATUS_TEXT: Record<string, string> = { new: "Sent, waiting for the company", accepted: "Accepted, they'll contact you", booked: "Booked", declined: "Not available", cancelled: "Cancelled" };

/** Everything a traveller has asked to book: partner requests (TB refs) and hired guides/drivers. */
export default async function BookingsPage() {
  const me = await requireUser();
  const db = await getDb();
  const [requests, hires] = await Promise.all([myBookings(me.id), db.select().from(s.hires).where(eq(s.hires.userId, me.id)).orderBy(desc(s.hires.createdAt))]);
  return (
    <div className="container-page py-6 sm:py-10">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
        <CalendarCheck2 className="h-7 w-7 text-savanna-600" /> My bookings
      </h1>
      <p className="mb-6 text-sm text-ink-muted">Requests you sent from your trip plans. Quote the TB reference when the company contacts you.</p>
      <Panel title="Packages, stays and transport">
        {requests.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {requests.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-display font-semibold">
                    <span className="mr-2 rounded-full bg-ink px-2 py-0.5 text-xs text-white">{b.ref}</span>
                    {b.title}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {b.partner} · {b.startDate} · {b.people} people · about {kes(b.estimateKes)} · sent {when(b.createdAt)}
                  </span>
                  {b.partnerNote && <span className="block text-xs text-ink-soft">{b.partnerNote}</span>}
                </span>
                <StatusBadge status={b.status === "new" ? "pending" : b.status === "booked" ? "paid" : b.status} label={STATUS_TEXT[b.status] ?? b.status} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No requests yet. Open a trip, go to Compare & book, and press Book on anything you like." />
        )}
      </Panel>
      <Panel title="Guides, drivers and photographers" className="mt-5">
        {hires.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {hires.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-display font-semibold">{h.providerName.replace(" (demo)", "")}</span>
                  <span className="text-xs text-ink-muted">
                    {h.start} · {h.people} people · {kes(h.total)} (deposit {kes(h.deposit)})
                  </span>
                </span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Nothing hired yet." />
        )}
        <Link href="/marketplace" className="mt-3 inline-block text-sm font-semibold text-savanna-700">
          Browse guides and drivers
        </Link>
      </Panel>
    </div>
  );
}
