import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { CalendarCheck2, HandCoins, Inbox, MousePointerClick } from "lucide-react";
import { markBooked, setBookingStatus } from "./actions";
import { Submit } from "@/components/admin/client";
import { Empty, Panel, Stat, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { bookingsForPartner, partnerFor, UNIT_LABEL } from "@/lib/bookings";
import { getDb, schema as s } from "@/lib/db";
import { PLACE_BY_ID } from "@/lib/data/places";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner dashboard" };

/** Where a B2B partner (Bonfire, a lodge, a car-hire firm) sees and confirms requests sent by Tembea254. */
export default async function PartnerDashboard({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const partner = await partnerFor(me.email);
  if (!partner) redirect("/partners");
  const db = await getDb();
  const [rows, offers, clicks] = await Promise.all([
    bookingsForPartner(partner.id),
    db.select().from(s.partnerOffers).where(eq(s.partnerOffers.partnerId, partner.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(s.referrals).where(eq(s.referrals.provider, partner.name)),
  ]);
  const open = rows.filter((r) => r.status === "new" || r.status === "accepted");
  const booked = rows.filter((r) => r.status === "booked");
  const commission = booked.reduce((a, r) => a + (r.commissionKes ?? 0), 0);
  const revenue = booked.reduce((a, r) => a + (r.bookedKes ?? 0), 0);

  return (
    <div className="container-page py-6 sm:py-10">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-savanna-600">Partner dashboard</p>
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">{partner.name}</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">Booking requests from travellers planning on Tembea254. Each has a TB reference: contact the traveller, then mark it booked so the referral is recorded.</p>
      <div className="mb-6 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))]">
        <Stat label="Open requests" value={open.length} icon={Inbox} tone="ochre" />
        <Stat label="Booked through Tembea254" value={booked.length} hint={kes(revenue)} icon={CalendarCheck2} />
        <Stat label="Travellers sent to you" value={clicks[0].n} hint="Clicks and requests" icon={MousePointerClick} tone="violet" />
        <Stat label="Commission due" value={kes(commission)} hint={`${Math.round(partner.commission * 100)}% agreed rate`} icon={HandCoins} tone="ink" />
      </div>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <Panel title="Booking requests">
        {rows.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink px-2 py-0.5 font-display text-xs font-bold text-white">{r.ref}</span>
                    <span className="font-display font-semibold">{r.title}</span>
                    <StatusBadge status={r.status === "new" ? "pending" : r.status === "booked" ? "paid" : r.status} label={r.status} />
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {r.name} · {r.phone ? `+${r.phone}` : ""} {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent(`${r.ref} via Tembea254`)}`} className="text-savanna-700 underline">{r.email}</a>}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {r.endDate ? `${r.startDate} → ${r.endDate}` : r.startDate} · {r.people} people{r.quantity > 1 ? ` · ${r.quantity}` : ""} · {r.placeId ? PLACE_BY_ID[r.placeId]?.name : ""} · estimate {kes(r.estimateKes)} · received {when(r.createdAt)}
                  </p>
                  {r.note && <p className="mt-1 rounded-xl bg-sand-50 p-2 text-sm">&ldquo;{r.note}&rdquo;</p>}
                  {r.status === "booked" && <p className="mt-1 text-sm text-savanna-700">Booked for {kes(r.bookedKes ?? 0)} · commission {kes(r.commissionKes ?? 0)}</p>}
                </div>
                {(r.status === "new" || r.status === "accepted") && (
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {r.status === "new" && (
                      <form action={setBookingStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="accepted" />
                        <Submit small>Accept</Submit>
                      </form>
                    )}
                    <form action={markBooked} className="flex gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="amount" inputMode="numeric" placeholder="Amount paid (KES)" defaultValue={r.estimateKes || ""} className={`${inputCls} h-9 w-40 text-xs`} />
                      <Submit small tone="soft">Mark booked</Submit>
                    </form>
                    <form action={setBookingStatus} className="flex gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="declined" />
                      <input name="note" placeholder="Reason (optional)" className={`${inputCls} h-9 w-36 text-xs`} />
                      <Submit small tone="outline">Decline</Submit>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No requests yet. They appear here, and in your email, as soon as a traveller books one of your listings." />
        )}
      </Panel>

      <Panel title="Your listings on Tembea254" className="mt-5">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {offers.map((o) => (
            <li key={o.id} className="flex justify-between gap-3 rounded-2xl bg-sand-50 px-3 py-2">
              <span className="min-w-0 truncate">{o.title}</span>
              <span className="shrink-0 font-display font-semibold">
                {kes(o.pricePerPerson)} <span className="text-xs font-normal text-ink-muted">{UNIT_LABEL[o.unit] ?? o.unit}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          To change prices or add packages, message the Tembea254 team or <Link href="/partners#join" className="underline">update your listing</Link>.
        </p>
      </Panel>
    </div>
  );
}
