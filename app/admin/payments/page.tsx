import { desc, eq, sql } from "drizzle-orm";
import { BadgeDollarSign, HandCoins, Receipt, Wallet } from "lucide-react";
import { decidePayout, markPayment } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, FilterTabs, PageHeader, Stat, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Payments & payouts" };

export default async function PaymentsAdmin({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "payouts" ? "payouts" : "payments";
  const db = await getDb();
  const [paid, orders, owedVendors, payouts] = await Promise.all([
    db.select({ sum: sql<number>`coalesce(sum(${s.payments.amount}),0)::int`, n: sql<number>`count(*)::int` }).from(s.payments).where(eq(s.payments.status, "paid")),
    db.select({ commission: sql<number>`coalesce(sum(${s.orders.commission}),0)::int` }).from(s.orders).where(sql`${s.orders.status} not in ('pending_payment','cancelled','refunded')`),
    db.select({ sum: sql<number>`coalesce(sum(${s.orderItems.vendorAmount}),0)::int` }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(sql`${s.orders.status} not in ('pending_payment','cancelled','refunded') and ${s.orderItems.fulfilment} <> 'cancelled'`),
    db.select({ sum: sql<number>`coalesce(sum(${s.payouts.amount}),0)::int` }).from(s.payouts).where(eq(s.payouts.status, "paid")),
  ]);
  return (
    <>
      <PageHeader title="Payments & payouts" text="Every M-Pesa payment in (shop orders, hire deposits) and every payout to vendors and creators." />
      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))]">
        <Stat label="Money received" value={kes(paid[0].sum)} hint={`${paid[0].n} payments`} icon={Receipt} />
        <Stat label="Tembea commission" value={kes(orders[0].commission)} icon={BadgeDollarSign} tone="ochre" />
        <Stat label="Vendor earnings (all time)" value={kes(owedVendors[0].sum)} icon={Wallet} tone="violet" />
        <Stat label="Paid out" value={kes(payouts[0].sum)} icon={HandCoins} tone="ink" />
      </div>
      <FilterTabs
        base="/admin/payments"
        param="tab"
        value={tab === "payouts" ? "payouts" : ""}
        options={[
          { value: "", label: "Payments in" },
          { value: "payouts", label: "Payouts out" },
        ]}
      />
      {tab === "payments" ? <Payments /> : <Payouts />}
    </>
  );
}

async function Payments() {
  const db = await getDb();
  const rows = await db.select({ p: s.payments, email: s.users.email }).from(s.payments).leftJoin(s.users, eq(s.users.id, s.payments.userId)).orderBy(desc(s.payments.createdAt)).limit(200);
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.p.id}
      empty="No payments yet."
      cols={[
        {
          label: "Payment",
          cell: ({ p, email }) => (
            <div>
              <p className="font-medium capitalize">{p.purpose.replace("_", " ")}</p>
              <p className="text-xs text-ink-muted">
                {email} · {p.phone} · ref {p.refId}
              </p>
            </div>
          ),
        },
        { label: "Amount", cell: ({ p }) => <span className="font-display font-semibold">{kes(p.amount)}</span> },
        { label: "Method", cell: ({ p }) => <span className="uppercase text-xs">{p.method}</span>, hideSm: true },
        { label: "Status", cell: ({ p }) => <StatusBadge status={p.status} /> },
        { label: "Receipt", cell: ({ p }) => <span className="font-mono text-xs">{p.receipt || "—"}</span>, hideSm: true },
        { label: "When", cell: ({ p }) => when(p.createdAt), hideSm: true },
        {
          label: "",
          cell: ({ p }) =>
            p.status === "pending" || p.status === "failed" ? (
              <form action={markPayment} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={p.id} />
                <input name="receipt" placeholder="M-Pesa code" className={`${inputCls} h-8 w-28 text-xs`} aria-label="M-Pesa receipt" />
                <Submit small name="ok" value="true" confirm="Mark this payment as received? Only do this after checking M-Pesa.">
                  Mark paid
                </Submit>
              </form>
            ) : null,
        },
      ]}
    />
  );
}

async function Payouts() {
  const db = await getDb();
  const rows = await db.select({ p: s.payouts, email: s.users.email, name: s.users.name }).from(s.payouts).leftJoin(s.users, eq(s.users.id, s.payouts.userId)).orderBy(desc(s.payouts.createdAt)).limit(200);
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.p.id}
      empty="No payout requests yet."
      cols={[
        {
          label: "Payee",
          cell: ({ p, email, name }) => (
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-xs text-ink-muted">
                {p.payeeType} · {email}
              </p>
            </div>
          ),
        },
        { label: "Amount", cell: ({ p }) => <span className="font-display font-semibold">{kes(p.amount)}</span> },
        { label: "To", cell: ({ p }) => `${p.method} ${p.destination}` },
        { label: "Status", cell: ({ p }) => <StatusBadge status={p.status} /> },
        { label: "Note", cell: ({ p }) => <span className="text-xs text-ink-muted">{p.note || "—"}</span>, hideSm: true },
        {
          label: "Process",
          cell: ({ p }) =>
            p.status === "paid" || p.status === "rejected" ? (
              <span className="font-mono text-xs">{p.reference || "—"}</span>
            ) : (
              <form action={decidePayout} className="flex flex-wrap items-center gap-1.5">
                <input type="hidden" name="id" value={p.id} />
                <input name="reference" placeholder="M-Pesa/bank ref" className={`${inputCls} h-8 w-32 text-xs`} aria-label="Reference" />
                {p.status === "requested" && (
                  <Submit small tone="outline" name="status" value="approved">
                    Approve
                  </Submit>
                )}
                <Submit small name="status" value="paid" confirm={`Confirm you've sent ${kes(p.amount)} to ${p.destination}?`}>
                  Mark paid
                </Submit>
                <Submit small tone="danger" name="status" value="rejected">
                  Reject
                </Submit>
              </form>
            ),
        },
      ]}
    />
  );
}
