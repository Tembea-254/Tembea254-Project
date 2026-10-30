import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Check, CircleX, MapPin, Package, RotateCcw, Store, Truck, Zap } from "lucide-react";
import { Submit } from "@/components/admin/client";
import { mediaUrl } from "@/components/shop/media";
import { OrderPoller } from "@/components/shop/order-status";
import { ReviewForm } from "@/components/shop/review-form";
import { ORDER_STATUS_LABEL, PICKUP_STATIONS } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { fmtDay } from "@/lib/delivery";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { cn, money } from "@/lib/utils";
import { cancelUnpaid, confirmReceived, requestReturn, submitReview } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

const STEPS = [
  { id: "placed", label: "Placed", icon: Check },
  { id: "paid", label: "Paid", icon: Check },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
];
const FUL: Record<string, string> = { pending: "Being prepared", processing: "Packed", shipped: "On the way", delivered: "Delivered", cancelled: "Cancelled" };
const SVC: Record<string, string> = { pending: "Waiting for the pro to confirm", processing: "Confirmed", shipped: "Confirmed", delivered: "Done", cancelled: "Cancelled" };

export default async function OrderPage({ params }: { params: { id: string } }) {
  const me = await requireUser();
  const db = await getDb();
  const o = (await db.select().from(s.orders).where(and(eq(s.orders.id, params.id), eq(s.orders.userId, me.id))))[0];
  if (!o) notFound();
  const [items, pay, events, settings] = await Promise.all([
    db.select({ i: s.orderItems, store: s.vendors.storeName, slug: s.vendors.slug, phone: s.vendors.phone }).from(s.orderItems).innerJoin(s.vendors, eq(s.vendors.id, s.orderItems.vendorId)).where(eq(s.orderItems.orderId, o.id)),
    o.paymentId ? db.select().from(s.payments).where(eq(s.payments.id, o.paymentId)) : Promise.resolve([]),
    db.select().from(s.shipmentEvents).where(eq(s.shipmentEvents.orderId, o.id)).orderBy(asc(s.shipmentEvents.createdAt)),
    getSettings(),
  ]);
  const p = pay[0];
  const failed = o.status === "pending_payment" && p?.status === "failed";
  const waiting = o.status === "pending_payment" && !failed;
  const a = o.address as { county: string; town: string; details?: string };
  const goods = items.filter((x) => x.i.kind === "product");
  const services = items.filter((x) => x.i.kind === "service");
  const station = PICKUP_STATIONS.find((x) => x.id === o.pickupStation);
  const reached = (id: string) => {
    if (id === "placed") return true;
    if (id === "paid") return o.status !== "pending_payment" && o.status !== "cancelled";
    if (id === "shipped") return ["shipped", "delivered"].includes(o.status);
    return o.status === "delivered";
  };
  const returnUntil = (d: Date) => d.getTime() + settings.returnWindowDays * 86400_000 > Date.now();

  return (
    <div className="container-page max-w-4xl py-6 sm:py-10">
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> My orders
      </Link>

      <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-card">
        <div className="bg-ink p-5 text-white sm:p-6">
          <p className="text-xs text-white/60">
            Order {o.id}
            {o.trackingNumber ? ` · Tracking ${o.trackingNumber}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{ORDER_STATUS_LABEL[o.status] ?? o.status}</h1>
          {o.etaFrom && !["delivered", "cancelled", "refunded"].includes(o.status) && (
            <p className="mt-1 flex items-center gap-1.5 text-white/85">
              <Truck className="h-4 w-4" /> {o.deliveryMethod === "pickup" ? "Ready to collect" : "Arriving"} {fmtDay(o.etaFrom)}
              {o.etaTo && +o.etaTo !== +o.etaFrom ? ` – ${fmtDay(o.etaTo)}` : ""}
            </p>
          )}
          {p?.method === "demo" && <p className="mt-1 text-sm text-white/60">Demo payment — M-Pesa isn't connected yet, so no money moved.</p>}
          {o.status !== "cancelled" && goods.length > 0 && (
            <ol className="mt-5 grid grid-cols-4 gap-1">
              {STEPS.map((st, i) => (
                <li key={st.id} className="relative text-center">
                  {i > 0 && <span className={cn("absolute right-1/2 top-4 h-0.5 w-full", reached(st.id) ? "bg-savanna-400" : "bg-white/15")} />}
                  <span className={cn("relative mx-auto grid h-8 w-8 place-items-center rounded-full", reached(st.id) ? "bg-savanna-500 text-white" : "bg-white/10 text-white/50")}>
                    <st.icon className="h-4 w-4" />
                  </span>
                  <span className="mt-1 block text-[11px] text-white/80 sm:text-xs">{st.label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="p-5 sm:p-6">
          {failed && (
            <p className="flex items-center gap-2 rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">
              <CircleX className="h-4 w-4" /> The M-Pesa payment didn't go through{p?.message ? `: ${p.message}` : ""}. Place the order again from your cart.
            </p>
          )}
          <OrderPoller waiting={waiting} />
          {o.status === "pending_payment" && (
            <form action={cancelUnpaid} className="mt-3">
              <input type="hidden" name="id" value={o.id} />
              <Submit small tone="outline">
                Cancel this order
              </Submit>
            </form>
          )}
          {["paid", "processing", "shipped"].includes(o.status) && (
            <form action={confirmReceived} className="flex flex-wrap items-center gap-3 rounded-2xl bg-savanna-50 p-3 text-sm">
              <input type="hidden" name="id" value={o.id} />
              <span className="flex-1">{goods.length ? "Got your parcel?" : "Did the service happen as booked?"} Confirm so the seller gets paid.</span>
              <Submit confirm="Confirm you received everything in this order?">{goods.length ? "I received it" : "It's done"}</Submit>
            </form>
          )}

          {events.length > 0 && (
            <section className="mt-5">
              <h2 className="mb-2 font-display font-bold">Tracking</h2>
              <ol className="relative space-y-4 border-l-2 border-sand-200 pl-5">
                {events
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <li key={e.id} className="relative">
                      <span className={cn("absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white", i === 0 ? "bg-savanna-500 ring-4 ring-savanna-100" : "bg-sand-200")} />
                      <p className={cn("text-sm font-semibold", i === 0 ? "text-ink" : "text-ink-soft")}>{e.title}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(e.createdAt).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {e.location ? ` · ${e.location}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      {services.length > 0 && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-card">
          <h2 className="mb-2 font-display font-bold">Bookings</h2>
          <ul className="divide-y divide-ink/[0.06]">
            {services.map(({ i, store, slug }) => (
              <li key={i.id} className="flex gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(i.image, 140, 140)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.title}</p>
                  <Link href={`/marketplace/store/${slug}`} className="text-xs text-savanna-700">
                    {store.replace(" (demo)", "")}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-dusk-50 px-2 py-0.5 font-medium text-dusk-700">
                      <CalendarDays className="h-3.5 w-3.5" /> {i.bookingDate ? fmtDay(i.bookingDate) : "—"} · {i.qty}×
                    </span>
                    <span className="text-ink-muted">{o.status === "pending_payment" ? "Awaiting payment" : SVC[i.fulfilment]}</span>
                  </p>
                  {i.bookingNote && <p className="mt-1 text-xs text-ink-muted">“{i.bookingNote}”</p>}
                  {i.trackingNote && <p className="mt-1 text-xs text-ink-soft">From the pro: {i.trackingNote}</p>}
                  {i.fulfilment === "delivered" && !i.reviewed && <div className="mt-2"><ReviewForm action={submitReview} orderId={o.id} itemId={i.id} title={i.title} /></div>}
                </div>
                <span className="font-display font-semibold">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {goods.length > 0 && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-card">
          <h2 className="mb-2 font-display font-bold">Items</h2>
          <ul className="divide-y divide-ink/[0.06]">
            {goods.map(({ i, store, slug }) => (
              <li key={i.id} className="flex gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(i.image, 140, 140)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.title}</p>
                  <Link href={`/marketplace/store/${slug}`} className="inline-flex items-center gap-1 text-xs text-savanna-700">
                    <Store className="h-3 w-3" /> {store.replace(" (demo)", "")}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {i.qty} × {money(i.price)} · {o.status === "pending_payment" ? "Awaiting payment" : FUL[i.fulfilment] ?? i.fulfilment}
                    {i.trackingNote ? ` · ${i.trackingNote}` : ""}
                  </p>
                  {i.returnStatus && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-ochre-50 px-2 py-0.5 text-xs font-medium text-ochre-700">
                      <RotateCcw className="h-3 w-3" /> Return {i.returnStatus}
                    </p>
                  )}
                  {i.fulfilment === "delivered" && (
                    <div className="mt-2 flex flex-wrap items-start gap-2">
                      {!i.reviewed && <ReviewForm action={submitReview} orderId={o.id} itemId={i.id} title={i.title} />}
                      {!i.returnStatus && returnUntil(i.updatedAt) && (
                        <details className="group">
                          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-full border border-ink/15 px-3 text-xs font-semibold">
                            <RotateCcw className="h-3.5 w-3.5" /> Return
                          </summary>
                          <form action={requestReturn} className="mt-2 flex flex-wrap gap-2">
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="item" value={i.id} />
                            <select name="reason" className="h-9 rounded-xl border border-ink/10 bg-white px-2 text-xs" required>
                              <option value="">Why?</option>
                              <option>Arrived damaged</option>
                              <option>Not as described</option>
                              <option>Wrong item or size</option>
                              <option>Changed my mind</option>
                            </select>
                            <Submit small tone="dark">
                              Request return
                            </Submit>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </div>
                <span className="font-display font-semibold">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 text-sm shadow-card">
          <h2 className="mb-1 font-display font-bold">{o.deliveryMethod === "pickup" ? "Collect from" : o.deliveryMethod === "none" ? "Contact" : "Delivering to"}</h2>
          <p>
            {o.buyerName} · {o.phone}
          </p>
          {o.deliveryMethod === "pickup" && station ? (
            <p className="mt-1 flex items-center gap-1 text-ink-muted">
              <MapPin className="h-3.5 w-3.5" /> {station.name}
            </p>
          ) : o.deliveryMethod === "home" ? (
            <p className="text-ink-muted">
              {a.town}, {a.county}
              {a.details ? ` — ${a.details}` : ""}
            </p>
          ) : null}
        </section>
        <section className="rounded-3xl bg-white p-5 text-sm shadow-card">
          <h2 className="mb-1 font-display font-bold">Payment</h2>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd>{money(o.subtotal)}</dd>
            </div>
            {o.deliveryMethod !== "none" && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd>{o.deliveryFee ? money(o.deliveryFee) : "Free"}</dd>
              </div>
            )}
            <div className="flex justify-between font-display text-lg font-bold">
              <dt>Total</dt>
              <dd>{money(o.total)}</dd>
            </div>
          </dl>
          {p?.receipt && (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
              <Zap className="h-3 w-3" /> M-Pesa {p.receipt}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
