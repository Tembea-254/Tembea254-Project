import Link from "next/link";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Film,
  Flag,
  Headset,
  Inbox,
  MessagesSquare,
  Package,
  Radio,
  Receipt,
  Route,
  ShieldAlert,
  ShoppingCart,
  Star,
  Store,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { AreaChart, CHART, Donut, KpiCard, RankBars, pctChange } from "@/components/admin/charts";
import { Panel, StatusBadge, kes, when } from "@/components/admin/kit";
import { PLACE_BY_ID } from "@/lib/data/places";
import { SERVICE_TYPE_BY_ID, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { adminQueues } from "@/lib/repo/admin-queues";
import { currentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Overview" };

const count = sql<number>`count(*)::int`;
const PAID = sql`${s.orders.status} not in ('pending_payment','cancelled','refunded')`;
const RANGES = [7, 30, 90] as const;
const DAY = 86400_000;

function dayKeys(from: number, n: number) {
  return Array.from({ length: n }, (_, i) => new Date(from + i * DAY).toISOString().slice(0, 10));
}
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));
const greeting = () => {
  const h = Number(new Date().toLocaleString("en-KE", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const ACTION_ICON: Record<string, typeof Activity> = { vendor: Store, product: Package, application: Inbox, user: Users, order: Receipt, payout: Wallet, review: Star, post: MessagesSquare, alert: ShieldAlert, blog: BookOpen, scene: Headset, submission: Film, live: Radio };
const actionLabel = (a: string) =>
  a
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

export default async function AdminOverview({ searchParams }: { searchParams: { range?: string } }) {
  const range = (RANGES as readonly number[]).includes(Number(searchParams.range)) ? Number(searchParams.range) : 30;
  const now = Date.now();
  const start = new Date(new Date(now - (range - 1) * DAY).toISOString().slice(0, 10));
  const prevStart = new Date(start.getTime() - range * DAY);
  const days = dayKeys(start.getTime(), range);
  const prevDays = dayKeys(prevStart.getTime(), range);
  const db = await getDb();
  const me = await currentUser();

  const byDay = (col: typeof s.orders.createdAt | typeof s.users.createdAt | typeof s.trips.createdAt) => sql<string>`to_char(${col}, 'YYYY-MM-DD')`;
  const [
    totals,
    salesDaily,
    usersDaily,
    tripsDaily,
    prevSales,
    prevUsers,
    prevTrips,
    tripStops,
    catSales,
    health,
    recentOrders,
    activity,
    q,
  ] = await Promise.all([
    Promise.all([
      db.select({ n: count }).from(s.users),
      db.select({ n: count }).from(s.vendors).where(eq(s.vendors.status, "verified")),
      db.select({ n: count }).from(s.products).where(eq(s.products.status, "active")),
      db.select({ n: count }).from(s.vrScenes).where(eq(s.vrScenes.published, true)),
      db.select({ n: count }).from(s.posts).where(eq(s.posts.status, "visible")),
      db.select({ sum: sql<number>`coalesce(sum(${s.payouts.amount}),0)::int` }).from(s.payouts).where(eq(s.payouts.status, "paid")),
    ]),
    db
      .select({ d: byDay(s.orders.createdAt), gmv: sql<number>`coalesce(sum(${s.orders.total}),0)::int`, commission: sql<number>`coalesce(sum(${s.orders.commission}),0)::int`, n: count })
      .from(s.orders)
      .where(and(PAID, gte(s.orders.createdAt, start)))
      .groupBy(sql`1`),
    db.select({ d: byDay(s.users.createdAt), n: count }).from(s.users).where(gte(s.users.createdAt, start)).groupBy(sql`1`),
    db.select({ d: byDay(s.trips.createdAt), n: count }).from(s.trips).where(gte(s.trips.createdAt, start)).groupBy(sql`1`),
    db
      .select({ d: byDay(s.orders.createdAt), gmv: sql<number>`coalesce(sum(${s.orders.total}),0)::int`, commission: sql<number>`coalesce(sum(${s.orders.commission}),0)::int`, n: count })
      .from(s.orders)
      .where(and(PAID, gte(s.orders.createdAt, prevStart), lt(s.orders.createdAt, start)))
      .groupBy(sql`1`),
    db.select({ n: count }).from(s.users).where(and(gte(s.users.createdAt, prevStart), lt(s.users.createdAt, start))),
    db.select({ n: count }).from(s.trips).where(and(gte(s.trips.createdAt, prevStart), lt(s.trips.createdAt, start))),
    db.select({ stops: s.trips.stops }).from(s.trips).orderBy(desc(s.trips.createdAt)).limit(2000),
    db
      .select({ category: s.products.category, kind: s.products.kind, serviceType: s.products.serviceType, sum: sql<number>`coalesce(sum(${s.orderItems.lineTotal}),0)::int` })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
      .where(and(PAID, gte(s.orders.createdAt, start)))
      .groupBy(s.products.category, s.products.kind, s.products.serviceType),
    Promise.all([
      db.select({ n: count }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(and(PAID, gte(s.orders.createdAt, start))),
      db.select({ n: count }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(and(PAID, gte(s.orders.createdAt, start), eq(s.orderItems.fulfilment, "delivered"))),
      db.select({ avg: sql<number>`coalesce(avg(nullif(${s.vendors.ratingAvg},0)),0)::float` }).from(s.vendors).where(eq(s.vendors.status, "verified")),
    ]),
    db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(6),
    db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(8),
    adminQueues(),
  ]);

  const [usersT, sellersT, productsT, scenesT, postsT, paidOutT] = totals.map((r) => (r[0] as { n?: number; sum?: number }).n ?? (r[0] as { sum: number }).sum);
  const series = (rows: { d: string }[], key: string, keys: string[]) => keys.map((d) => Number((rows.find((r) => r.d === d) as Record<string, unknown> | undefined)?.[key] ?? 0));
  const gmv = series(salesDaily, "gmv", days);
  const commission = series(salesDaily, "commission", days);
  const orders = series(salesDaily, "n", days);
  const signups = series(usersDaily, "n", days);
  const trips = series(tripsDaily, "n", days);
  const prevGmv = series(prevSales, "gmv", prevDays);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const gmvNow = sum(gmv),
    gmvPrev = sum(prevGmv);
  const comNow = sum(commission),
    comPrev = sum(series(prevSales, "commission", prevDays));
  const ordersNow = sum(orders),
    ordersPrev = sum(series(prevSales, "n", prevDays));
  const usersNow = sum(signups),
    tripsNow = sum(trips);

  // top destinations from every planned trip
  const stopCount = new Map<string, number>();
  for (const t of tripStops) for (const id of new Set(t.stops)) stopCount.set(id, (stopCount.get(id) ?? 0) + 1);
  const topPlaces = [...stopCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, n]) => ({ label: PLACE_BY_ID[id]?.name ?? id, value: n }));

  // sales mix: five slices at most
  const mix = new Map<string, number>();
  for (const c of catSales) {
    const name = c.kind === "service" ? `${SERVICE_TYPE_BY_ID[c.serviceType ?? ""]?.name ?? "Services"}` : SHOP_CATEGORY_BY_ID[c.category]?.name ?? c.category;
    mix.set(name, (mix.get(name) ?? 0) + c.sum);
  }
  const mixSorted = [...mix.entries()].sort((a, b) => b[1] - a[1]);
  const palette = [CHART.green, CHART.ochre, CHART.violet, "#2FC57A", CHART.red];
  const parts = [...mixSorted.slice(0, 4), ...(mixSorted.length > 4 ? [["Other", sum(mixSorted.slice(4).map((x) => x[1]))] as [string, number]] : [])].map(([label, value], i) => ({ label, value, color: palette[i] }));

  const [itemsN, deliveredN, ratingAvg] = health;
  const aov = ordersNow ? gmvNow / ordersNow : 0;
  const takeRate = gmvNow ? (comNow / gmvNow) * 100 : 0;
  const delivered = itemsN[0].n ? (deliveredN[0].n / itemsN[0].n) * 100 : 0;

  const queue = [
    { label: "Seller applications", n: q.vendors, href: "/admin/approvals?tab=sellers", icon: Store, tone: "bg-savanna-50 text-savanna-700" },
    { label: "Creator applications", n: q.creatorApps, href: "/admin/approvals?tab=creators", icon: Clapperboard, tone: "bg-dusk-50 text-dusk-500" },
    { label: "Products to approve", n: q.products, href: "/admin/approvals?tab=products", icon: Package, tone: "bg-ochre-50 text-ochre-700" },
    { label: "Paid orders to ship", n: q.ordersToShip, href: "/admin/shop?tab=orders&status=paid", icon: ShoppingCart, tone: "bg-savanna-50 text-savanna-700" },
    { label: "Videos to review", n: q.submissions, href: "/admin/creators", icon: Film, tone: "bg-dusk-50 text-dusk-500" },
    { label: "Live walks", n: q.live, href: "/admin/creators?tab=live", icon: Radio, tone: "bg-maasai-50 text-maasai-600" },
    { label: "Reviews", n: q.reviews, href: "/admin/reviews", icon: Star, tone: "bg-ochre-50 text-ochre-700" },
    { label: "Reported posts", n: q.reports, href: "/admin/community?tab=reports", icon: Flag, tone: "bg-maasai-50 text-maasai-600" },
    { label: "Payouts", n: q.payouts, href: "/admin/payments?tab=payouts", icon: Wallet, tone: "bg-savanna-50 text-savanna-700" },
    { label: "Hire providers", n: q.providerApps, href: "/admin/marketplace?tab=applications", icon: Wrench, tone: "bg-sand-100 text-ink-soft" },
  ].sort((a, b) => b.n - a.n);
  const waiting = sum(queue.map((x) => x.n));
  const firstName = (me?.name || "").split(" ")[0];
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

  return (
    <>
      {/* ------------------------------ Greeting + range ------------------------------ */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <CalendarDays className="h-4 w-4" /> {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{waiting ? `${waiting} item${waiting === 1 ? "" : "s"} need${waiting === 1 ? "s" : ""} your attention today.` : "You're all caught up — nothing is waiting for a decision."}</p>
        </div>
        <div className="inline-flex rounded-xl bg-white p-1 shadow-card" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin?range=${r}`} className={cn("rounded-lg px-3.5 py-1.5 font-display text-sm font-semibold", r === range ? "bg-ink text-white" : "text-ink-soft hover:text-ink")} aria-current={r === range ? "true" : undefined}>
              {r} days
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tembea revenue" value={kes(comNow)} delta={pctChange(comNow, comPrev)} spark={commission} icon={BadgeDollarSign} color={CHART.green} hint={`Commission on ${ordersNow} orders`} href="/admin/payments" />
        <KpiCard label="Bookings & sales (GMV)" value={kes(gmvNow)} delta={pctChange(gmvNow, gmvPrev)} spark={gmv} icon={ShoppingCart} color={CHART.ochre} hint={`vs ${kes(gmvPrev)} previous ${range} days`} href="/admin/shop?tab=orders" />
        <KpiCard label="New travellers" value={usersNow.toLocaleString()} delta={pctChange(usersNow, prevUsers[0].n)} spark={signups} icon={Users} color={CHART.violet} hint={`${usersT.toLocaleString()} users in total`} href="/admin/users" />
        <KpiCard label="AI trips planned" value={tripsNow.toLocaleString()} delta={pctChange(tripsNow, prevTrips[0].n)} spark={trips} icon={Route} color={CHART.red} hint="Itineraries saved from the planner" href="/admin/trips" />
      </div>

      {/* ------------------------------ Hero chart + approvals ------------------------------ */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <Panel>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">Bookings & sales</h2>
              <p className="text-sm text-ink-muted">Paid marketplace orders per day, last {range} days</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-savanna-500" /> This period
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-ink-muted/60" /> Previous {range} days
              </span>
            </div>
          </div>
          <AreaChart data={days.map((d, i) => ({ label: fmtDay(d), value: gmv[i] }))} prev={prevGmv} format={(n) => (n ? `KES ${short(n)}` : "0")} />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/[0.06] pt-4 sm:grid-cols-4">
            {[
              ["Orders", ordersNow.toLocaleString(), pctChange(ordersNow, ordersPrev)],
              ["Average order", kes(aov), null],
              ["Take rate", `${takeRate.toFixed(1)}%`, null],
              ["Paid out to sellers", kes(paidOutT), null],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <dt className="text-xs text-ink-muted">{l}</dt>
                <dd className="mt-0.5 font-display text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel
          title="Approvals inbox"
          actions={
            <Link href="/admin/approvals" className="inline-flex items-center gap-1 text-sm font-semibold text-savanna-600">
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="space-y-1">
            {queue.slice(0, 7).map((x) => (
              <li key={x.label}>
                <Link href={x.href} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", x.tone)}>
                    <x.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{x.label}</span>
                  <span className={x.n ? "grid h-6 min-w-6 place-items-center rounded-full bg-ochre-400 px-2 font-display text-xs font-bold text-ink" : "text-xs text-ink-muted"}>{x.n || "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ------------------------------ Insights ------------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <Panel title="Top destinations planned" actions={<span className="text-xs text-ink-muted">All trips</span>}>
          <RankBars rows={topPlaces} format={(n) => `${n} trip${n === 1 ? "" : "s"}`} />
        </Panel>
        <Panel title="Sales mix" actions={<span className="text-xs text-ink-muted">Last {range} days</span>}>
          <Donut parts={parts} format={kes} center={{ value: `KES ${short(gmvNow)}`, label: "GMV" }} />
        </Panel>
        <Panel title="Marketplace health" className="lg:col-span-2 xl:col-span-1">
          <ul className="space-y-4">
            {[
              { l: "Items delivered", v: delivered, txt: `${delivered.toFixed(0)}%`, good: 90 },
              { l: "Take rate (commission ÷ GMV)", v: Math.min(100, takeRate * 5), txt: `${takeRate.toFixed(1)}%`, good: 50 },
              { l: "Average seller rating", v: (ratingAvg[0].avg / 5) * 100, txt: ratingAvg[0].avg ? `${ratingAvg[0].avg.toFixed(1)} / 5` : "—", good: 80 },
            ].map((m) => (
              <li key={m.l}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{m.l}</span>
                  <span className="font-display font-semibold">{m.txt}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand-100">
                  <div className={cn("h-full rounded-full", m.v >= m.good ? "bg-savanna-500" : "bg-ochre-400")} style={{ width: `${Math.max(2, Math.min(100, m.v))}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[
              { i: Store, l: "Verified sellers", v: sellersT, href: "/admin/shop?tab=vendors" },
              { i: Package, l: "Live listings", v: productsT, href: "/admin/shop?tab=products&status=active" },
              { i: Headset, l: "360° scenes", v: scenesT, href: "/admin/vr" },
              { i: MessagesSquare, l: "Community posts", v: postsT, href: "/admin/community" },
            ].map((x) => (
              <Link key={x.l} href={x.href} className="flex items-center gap-2 rounded-2xl bg-sand-50 p-2.5 hover:bg-sand-100">
                <x.i className="h-4 w-4 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{x.l}</span>
                <span className="font-display font-bold">{x.v.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* ------------------------------ Orders + activity ------------------------------ */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <Panel
          title="Latest orders"
          actions={
            <Link href="/admin/shop?tab=orders" className="inline-flex items-center gap-1 text-sm font-semibold text-savanna-600">
              All orders <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {recentOrders.length ? (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-y border-ink/[0.06] bg-sand-50/70 text-[11px] uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-2 font-display font-semibold sm:px-5">Order</th>
                    <th className="px-2 py-2 font-display font-semibold">Buyer</th>
                    <th className="px-2 py-2 font-display font-semibold">Placed</th>
                    <th className="px-2 py-2 text-right font-display font-semibold">Total</th>
                    <th className="px-4 py-2 text-right font-display font-semibold sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-sand-50/60">
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted sm:px-5">#{o.id.slice(-6).toUpperCase()}</td>
                      <td className="max-w-[160px] truncate px-2 py-2.5 font-medium">{o.buyerName}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-ink-muted">{when(o.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right font-display font-semibold">{kes(o.total)}</td>
                      <td className="px-4 py-2.5 text-right sm:px-5">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No orders yet.</p>
          )}
        </Panel>
        <Panel
          title="Recent activity"
          actions={
            <Link href="/admin/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-savanna-600">
              Log <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {activity.length ? (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-ink/[0.08]">
              {activity.map((a) => {
                const Icon = ACTION_ICON[a.action.split(".")[0]] ?? Activity;
                return (
                  <li key={a.id} className="relative flex gap-3">
                    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white ring-1 ring-ink/10">
                      <Icon className="h-3.5 w-3.5 text-ink-soft" />
                    </span>
                    <span className="min-w-0 pt-0.5 text-sm">
                      <span className="block truncate font-medium">{actionLabel(a.action)}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {a.actorEmail ?? "system"} · {when(a.createdAt)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-ink-muted">Admin actions will show here.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
