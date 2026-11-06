import { desc, eq } from "drizzle-orm";
import { decideApplication, setHireStatus, setProviderStatus } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, Empty, FilterTabs, PageHeader, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { HUBS } from "@/lib/data/market";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Hire marketplace" };

const HUB = Object.fromEntries(HUBS.map((h) => [h.id, h.name]));

export default async function MarketplaceAdmin({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = ["applications", "hires"].includes(searchParams.tab || "") ? searchParams.tab! : "providers";
  const db = await getDb();
  return (
    <>
      <PageHeader title="Hire marketplace" text="Drivers, guides, photographers and artists travellers book in advance. Approve new providers and follow up bookings." />
      <FilterTabs
        base="/admin/marketplace"
        param="tab"
        value={tab === "providers" ? "" : tab}
        options={[
          { value: "", label: "Providers" },
          { value: "applications", label: "Applications" },
          { value: "hires", label: "Bookings" },
        ]}
      />
      {tab === "providers" && (
        <DataTable
          rows={await db.select().from(s.providers).orderBy(s.providers.hub, s.providers.category)}
          rowKey={(p) => p.id}
          cols={[
            {
              label: "Provider",
              cell: (p) => (
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink-muted">
                    {p.category} · {HUB[p.hub] ?? p.hub} · {p.base}
                  </p>
                </div>
              ),
            },
            { label: "Status", cell: (p) => <span className="flex gap-1">{p.demo && <StatusBadge status="draft" label="Demo" />}<StatusBadge status={p.status} /></span> },
            {
              label: "Rate",
              cell: (p) => (
                <form action={setProviderStatus} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={p.status} />
                  <input name="rate" type="number" defaultValue={p.rate} className={`${inputCls} h-8 w-28 text-xs`} aria-label="Rate" />
                  <span className="text-xs text-ink-muted">{p.unit}</span>
                  <Submit small tone="outline">
                    Save
                  </Submit>
                </form>
              ),
            },
            {
              label: "",
              cell: (p) => (
                <form action={setProviderStatus}>
                  <input type="hidden" name="id" value={p.id} />
                  <Submit small tone={p.status === "active" ? "outline" : "primary"} name="status" value={p.status === "active" ? "hidden" : "active"}>
                    {p.status === "active" ? "Hide" : "Show"}
                  </Submit>
                </form>
              ),
            },
          ]}
        />
      )}
      {tab === "applications" && <Applications />}
      {tab === "hires" && <Hires />}
    </>
  );
}

async function Applications() {
  const db = await getDb();
  const rows = await db.select({ a: s.applications, email: s.users.email, name: s.users.name }).from(s.applications).leftJoin(s.users, eq(s.users.id, s.applications.userId)).where(eq(s.applications.kind, "provider")).orderBy(desc(s.applications.createdAt)).limit(100);
  if (!rows.length) return <Empty text="No provider applications yet." />;
  return (
    <ul className="space-y-3">
      {rows.map(({ a, email, name }) => {
        const d = a.data as { business: string; phone: string; about: string; hub: string; category: string };
        return (
          <li key={a.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold">{d.business}</h3>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-sm text-ink-muted">
              {name} · {email} · {d.phone} · {d.category} · {HUB[d.hub] ?? d.hub} · {when(a.createdAt)}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{d.about}</p>
            {a.status === "pending" && (
              <form action={decideApplication} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={a.id} />
                <label className="text-xs text-ink-muted">
                  Rate (KES)
                  <input name="rate" type="number" min={0} placeholder="5000" className={`${inputCls} mt-0.5 h-9 w-28`} />
                </label>
                <label className="text-xs text-ink-muted">
                  Per
                  <select name="unit" className={`${inputCls} mt-0.5 h-9 w-36`}>
                    {["per day", "per half day", "per session", "per event", "per transfer"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <input name="note" placeholder="Note (optional)" className={`${inputCls} h-9 w-56`} aria-label="Note" />
                <Submit small name="decision" value="approve">
                  Approve & list
                </Submit>
                <Submit small tone="danger" name="decision" value="reject">
                  Reject
                </Submit>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

async function Hires() {
  const db = await getDb();
  const rows = await db.select({ h: s.hires, email: s.users.email }).from(s.hires).leftJoin(s.users, eq(s.users.id, s.hires.userId)).orderBy(desc(s.hires.createdAt)).limit(150);
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.h.id}
      empty="No bookings yet."
      cols={[
        {
          label: "Booking",
          cell: ({ h, email }) => (
            <div>
              <p className="font-medium">{h.providerName}</p>
              <p className="text-xs text-ink-muted">
                {email} · {h.phone}
              </p>
            </div>
          ),
        },
        { label: "Date", cell: ({ h }) => `${h.start} · ${h.units}× · ${h.people} ppl` },
        { label: "Total / deposit", cell: ({ h }) => `${kes(h.total)} / ${kes(h.deposit)}` },
        { label: "Status", cell: ({ h }) => <StatusBadge status={h.status} /> },
        {
          label: "Update",
          cell: ({ h }) => (
            <form action={setHireStatus} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={h.id} />
              <select name="status" defaultValue={h.status} className={`${inputCls} h-8 w-36 text-xs`} aria-label="Booking status">
                {["requested", "confirmed", "deposit-pending", "deposit-paid", "completed", "cancelled"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <Submit small tone="outline">
                Save
              </Submit>
            </form>
          ),
        },
      ]}
    />
  );
}
