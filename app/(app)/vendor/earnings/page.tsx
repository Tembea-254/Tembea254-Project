import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { BadgeDollarSign, Clock, Wallet } from "lucide-react";
import { requestPayout } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, Panel, Stat, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { myVendor, vendorBalance } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Earnings" };

export default async function VendorEarnings({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "rejected") redirect("/vendor");
  const db = await getDb();
  const [bal, settings, payouts] = await Promise.all([
    vendorBalance(v.id, me.id),
    getSettings(),
    db.select().from(s.payouts).where(and(eq(s.payouts.userId, me.id), eq(s.payouts.payeeType, "vendor"))).orderBy(desc(s.payouts.createdAt)),
  ]);
  const can = v.status === "verified" && bal.available >= settings.minPayoutKes;
  return (
    <>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
        <Stat label="Available" value={kes(bal.available)} icon={Wallet} />
        <Stat label="Waiting on delivery" value={kes(bal.pending)} icon={Clock} tone="ochre" />
        <Stat label="Withdrawn & requested" value={kes(bal.paidOut)} icon={BadgeDollarSign} tone="ink" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Withdraw to M-Pesa">
          <p className="text-sm text-ink-muted">
            Paid to <span className="font-semibold text-ink">{v.payoutAccount || v.phone}</span>. Minimum {kes(settings.minPayoutKes)}. We process payouts within 2 working days.
          </p>
          <form action={requestPayout} className="mt-3 flex flex-wrap gap-2">
            <input name="amount" type="number" min={settings.minPayoutKes} max={bal.available} defaultValue={bal.available || ""} className={`${inputCls} w-40`} aria-label="Amount" disabled={!can} />
            <Submit className="h-11" tone={can ? "primary" : "outline"}>
              Request payout
            </Submit>
          </form>
          {!can && <p className="mt-2 text-xs text-ink-muted">{v.status !== "verified" ? "Payouts open once your store is verified." : `You can withdraw once you have ${kes(settings.minPayoutKes)} available.`}</p>}
          <div className="mt-5 rounded-2xl bg-sand-50 p-3 text-xs text-ink-soft">
            <p className="font-display text-sm font-semibold text-ink">How your money flows</p>
            <p className="mt-1">Buyer pays Tembea by M-Pesa → Tembea keeps its commission ({kes(bal.commission)} so far) → your share waits until the order is delivered → it becomes available here to withdraw.</p>
          </div>
        </Panel>
        <Panel title="Payout history">
          <DataTable
            rows={payouts}
            rowKey={(p) => p.id}
            empty="No payouts yet."
            cols={[
              { label: "Requested", cell: (p) => when(p.createdAt) },
              { label: "Amount", cell: (p) => <span className="font-display font-semibold">{kes(p.amount)}</span> },
              { label: "Status", cell: (p) => <StatusBadge status={p.status} /> },
              { label: "M-Pesa ref", cell: (p) => p.reference || "—", hideSm: true },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
