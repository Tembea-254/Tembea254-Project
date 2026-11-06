import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { MapPin, Phone } from "lucide-react";
import { setItemFulfilment } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, FilterTabs, StatusBadge, inputCls, kes, mediaSrc, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { myVendor } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Orders" };

const SVC_LABEL: Record<string, string> = { pending: "New booking — confirm it", processing: "Confirmed", shipped: "Done — waiting for the guest to confirm", delivered: "Completed", cancelled: "Declined" };
const LABEL: Record<string, string> = { pending: "New — pack it", processing: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

export default async function VendorOrders({ searchParams }: { searchParams: { f?: string; ok?: string; error?: string } }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "rejected") redirect("/vendor");
  const db = await getDb();
  const f = searchParams.f || "open";
  const where = [eq(s.orderItems.vendorId, v.id), sql`${s.orders.status} <> 'pending_payment'`];
  if (f === "open") where.push(sql`${s.orderItems.fulfilment} in ('pending','processing')`);
  if (f === "shipped") where.push(eq(s.orderItems.fulfilment, "shipped"));
  if (f === "done") where.push(sql`${s.orderItems.fulfilment} in ('delivered','cancelled')`);
  const rows = await db
    .select({ i: s.orderItems, o: s.orders })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(...where))
    .orderBy(desc(s.orders.createdAt))
    .limit(100);
  // group by order so one parcel = one card
  const groups = new Map<string, { o: (typeof rows)[number]["o"]; items: (typeof rows)[number]["i"][] }>();
  for (const r of rows) {
    const g = groups.get(r.o.id) ?? { o: r.o, items: [] };
    g.items.push(r.i);
    groups.set(r.o.id, g);
  }

  return (
    <>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <FilterTabs
        base="/vendor/orders"
        param="f"
        value={f}
        options={[
          { value: "open", label: "To prepare" },
          { value: "shipped", label: "Shipped" },
          { value: "done", label: "Completed" },
          { value: "all", label: "All" },
        ]}
      />
      {!groups.size && <Empty text={f === "open" ? "Nothing to prepare right now." : "No orders here yet."} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from(groups.values()).map(({ o, items }) => {
          const a = o.address as { county: string; town: string; details?: string };
          const open = items.filter((i) => i.fulfilment === "pending" || i.fulfilment === "processing");
          const yours = items.reduce((t, i) => t + i.vendorAmount, 0);
          return (
            <article key={o.id} className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold">{o.buyerName}</p>
                  <p className="text-xs text-ink-muted">
                    {o.id} · {when(o.createdAt)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </header>
              <ul className="mt-3 divide-y divide-ink/[0.06]">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaSrc(i.image, 100, 100)} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {i.qty} × {i.title}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {i.kind === "service" ? SVC_LABEL[i.fulfilment] : LABEL[i.fulfilment]}
                        {i.trackingNote ? ` · ${i.trackingNote}` : ""}
                      </span>
                    </span>
                    <span className="text-right text-xs">
                      <span className="block font-display text-sm font-semibold">{kes(i.vendorAmount)}</span>
                      <span className="text-ink-muted">after {Math.round(i.commissionRate * 100)}% fee</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 rounded-2xl bg-sand-50 p-3 text-xs text-ink-soft">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {a.town}, {a.county}
                  {a.details ? ` — ${a.details}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {o.phone}
                </p>
              </div>
              {open.filter((i) => i.kind === "product").length > 0 && (
                <form action={setItemFulfilment} className="mt-3 flex flex-wrap items-center gap-2">
                  {open
                    .filter((i) => i.kind === "product")
                    .map((i) => (
                      <input key={i.id} type="hidden" name="id" value={i.id} />
                    ))}
                  <input name="note" placeholder="Courier & tracking (e.g. G4S KE123)" className={`${inputCls} h-10 w-full sm:w-auto sm:min-w-0 sm:flex-1`} aria-label="Courier and tracking number" />
                  {open.some((i) => i.kind === "product" && i.fulfilment === "pending") && (
                    <Submit tone="outline" name="to" value="processing">
                      Packed
                    </Submit>
                  )}
                  <Submit name="to" value="shipped">
                    Handed to courier
                  </Submit>
                </form>
              )}
              {open
                .filter((i) => i.kind === "service")
                .map((i) => (
                  <form key={i.id} action={setItemFulfilment} className="mt-3 rounded-2xl bg-dusk-50 p-3">
                    <input type="hidden" name="id" value={i.id} />
                    <p className="text-sm font-semibold text-dusk-700">
                      Booking for {i.bookingDate} · {i.qty}×
                    </p>
                    {i.bookingNote && <p className="text-xs text-ink-soft">“{i.bookingNote}”</p>}
                    <input name="note" placeholder="Message to the guest (pick-up time, what to bring)" className={`${inputCls} mt-2 h-10`} aria-label="Message to the guest" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {i.fulfilment === "pending" ? (
                        <>
                          <Submit small name="to" value="processing">
                            Confirm booking
                          </Submit>
                          <Submit small tone="danger" name="to" value="cancelled" confirm="Decline this booking? The guest will be refunded.">
                            Can't make it
                          </Submit>
                        </>
                      ) : (
                        <Submit small name="to" value="shipped">
                          Mark as done
                        </Submit>
                      )}
                    </div>
                  </form>
                ))}
              <p className="mt-3 text-right text-xs text-ink-muted">
                You receive <span className="font-display text-sm font-semibold text-ink">{kes(yours)}</span>
              </p>
            </article>
          );
        })}
      </div>
    </>
  );
}
