import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { BadgeDollarSign, Clock, Package, Plus, ShoppingCart, Wallet } from "lucide-react";
import { Panel, Stat, StatusBadge, kes, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { myVendor, sellerScore, vendorBalance } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";

export default async function VendorHome({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "pending" || v.status === "rejected") redirect("/marketplace/join/seller");
  const db = await getDb();
  const [bal, counts, recent, sc] = await Promise.all([
    vendorBalance(v.id, me.id),
    db.select({ status: s.products.status, n: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.vendorId, v.id)).groupBy(s.products.status),
    db
      .select({ i: s.orderItems, o: s.orders })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orderItems.vendorId, v.id), sql`${s.orders.status} <> 'pending_payment'`))
      .orderBy(desc(s.orders.createdAt))
      .limit(6),
    sellerScore(v.id),
  ]);
  const c = (st: string) => counts.find((x) => x.status === st)?.n ?? 0;
  return (
    <>
      <Flash {...searchParams} />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
        <Stat label="Available to withdraw" value={kes(bal.available)} hint="From delivered orders" icon={Wallet} href="/vendor/earnings" />
        <Stat label="On the way" value={kes(bal.pending)} hint="Paid, not yet delivered" icon={Clock} tone="ochre" href="/vendor/orders" />
        <Stat label="Total sales" value={kes(bal.sales)} hint={`${bal.units} items sold`} icon={ShoppingCart} tone="violet" />
        <Stat label="Tembea commission" value={kes(bal.commission)} hint="Already deducted" icon={BadgeDollarSign} tone="ink" />
        <Stat label="Live products" value={c("active")} hint={`${c("pending")} waiting for approval`} icon={Package} href="/vendor/products" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Latest orders" actions={<Link href="/vendor/orders" className="text-sm font-semibold text-savanna-600">All orders</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-ink/[0.06] text-sm">
              {recent.map(({ i, o }) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {i.qty} × {i.title}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {o.buyerName} · {when(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-display font-semibold">{kes(i.vendorAmount)}</span>
                    <StatusBadge status={i.fulfilment} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No orders yet. Share your store link with customers to get your first sale.</p>
          )}
        </Panel>
        <div className="space-y-4">
        <Panel title="Your seller score">
          <div className="flex items-center gap-4">
            <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border-[6px] ${sc.score >= 4 ? "border-savanna-500" : sc.score >= 3 ? "border-ochre-400" : "border-maasai-500"}`}>
              <span className="font-display text-2xl font-bold">{sc.score.toFixed(1)}</span>
            </div>
            <div className="text-sm">
              <p className="font-display font-semibold">{sc.score >= 4 ? "Great — buyers see you as a top seller" : sc.score >= 3 ? "Good — keep shipping on time" : "Needs attention"}</p>
              <p className="text-ink-muted">Rating {sc.ratingCount ? `${sc.rating.toFixed(1)} (${sc.ratingCount})` : "—"} · On-time {Math.round((1 - sc.lateRate) * 100)}% · Cancelled {Math.round(sc.cancelRate * 100)}%{sc.strikes ? ` · ${sc.strikes} strike${sc.strikes > 1 ? "s" : ""}` : ""}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Ship within 48 hours, confirm bookings within 24 hours and describe items honestly. Low scores push your listings down; repeated strikes pause your store.</p>
        </Panel>
        <Panel title="Get selling">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-savanna-500 text-xs font-bold text-white">1</span> Add products or services with clear photos and honest descriptions.
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-savanna-500 text-xs font-bold text-white">2</span> For orders: pack within 48 hours and hand to a courier with a tracking note. For bookings: confirm within 24 hours.
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-savanna-500 text-xs font-bold text-white">3</span> Once the buyer confirms delivery, your share moves to "Available" and you can withdraw to M-Pesa.
            </li>
          </ol>
          <Link href="/vendor/products?edit=new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> New listing
          </Link>
        </Panel>
        </div>
      </div>
    </>
  );
}
