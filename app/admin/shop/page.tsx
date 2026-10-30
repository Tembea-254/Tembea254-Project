import Link from "next/link";
import { and, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { addTrackingEvent, addVendorStrike, clearVendorStrikes, decideReturn, setOrderStatus, setProductStatus, setVendorCommission, setVendorStatus, toggleFeatured } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, Empty, FilterTabs, PageHeader, SearchBox, StatusBadge, inputCls, kes, mediaSrc, when } from "@/components/admin/kit";
import { HUB_NAMES, ORDER_STATUS_LABEL, PICKUP_STATIONS, SERVICE_TYPE_BY_ID, SERVICE_UNITS, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Marketplace & sellers" };

export default async function ShopAdmin({ searchParams }: { searchParams: { tab?: string; status?: string; q?: string } }) {
  const tab = ["products", "orders"].includes(searchParams.tab || "") ? searchParams.tab! : "vendors";
  return (
    <>
      <PageHeader title="Marketplace sellers" text="Verify makers and local pros (ID, KRA PIN, payout number), approve listings before they go live, follow orders and bookings, handle returns and give policy strikes." />
      <FilterTabs
        base="/admin/shop"
        param="tab"
        value={tab === "vendors" ? "" : tab}
        options={[
          { value: "", label: "Vendors" },
          { value: "products", label: "Products" },
          { value: "orders", label: "Orders" },
        ]}
      />
      {tab === "vendors" && <Vendors status={searchParams.status} q={searchParams.q} />}
      {tab === "products" && <Products status={searchParams.status} q={searchParams.q} />}
      {tab === "orders" && <Orders status={searchParams.status} />}
    </>
  );
}

function StatusLinks({ tab, value, options }: { tab: string; value: string; options: [string, string][] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
      {options.map(([v, l]) => (
        <Link key={v} href={`/admin/shop?tab=${tab}${v ? `&status=${v}` : ""}`} className={`rounded-full px-3 py-1.5 ${value === v ? "bg-savanna-500 text-white" : "bg-white text-ink-soft shadow-card"}`}>
          {l}
        </Link>
      ))}
    </div>
  );
}

async function Vendors({ status = "", q = "" }: { status?: string; q?: string }) {
  const db = await getDb();
  const settings = await getSettings();
  const where: SQL[] = [];
  if (status) where.push(eq(s.vendors.status, status as "pending"));
  if (q) where.push(ilike(s.vendors.storeName, `%${q}%`));
  const rows = await db
    .select({
      v: s.vendors,
      email: s.users.email,
      products: sql<number>`(select count(*)::int from ${s.products} p where p.vendor_id = ${s.vendors.id})`,
      sales: sql<number>`(select coalesce(sum(i.line_total),0)::int from ${s.orderItems} i join ${s.orders} o on o.id = i.order_id where i.vendor_id = ${s.vendors.id} and o.status not in ('pending_payment','cancelled','refunded'))`,
    })
    .from(s.vendors)
    .leftJoin(s.users, eq(s.users.id, s.vendors.userId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.vendors.createdAt))
    .limit(100);
  return (
    <>
      <StatusLinks tab="vendors" value={status} options={[["", "All"], ["pending", "To verify"], ["verified", "Verified"], ["suspended", "Suspended"], ["rejected", "Rejected"]]} />
      <SearchBox action="/admin/shop" value={q} placeholder="Search store name" hidden={{ tab: "vendors", ...(status ? { status } : {}) }} />
      {!rows.length && <Empty text="No vendors here yet." />}
      <ul className="space-y-3">
        {rows.map(({ v, email, products, sales }) => (
          <li key={v.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {v.logo ? <img src={mediaSrc(v.logo, 120, 120)} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sand-100 font-display text-lg font-bold">{v.storeName[0]}</span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{v.storeName}</h3>
                  <StatusBadge status={v.status} />
                  <StatusBadge status="visible" label={v.sellerType === "pro" ? `Pro${v.hub ? ` · ${HUB_NAMES[v.hub] ?? v.hub}` : ""}` : v.sellerType === "both" ? "Maker & pro" : "Maker"} />
                  {v.featured && <StatusBadge status="admin" label="Featured" />}
                  {v.strikes > 0 && <StatusBadge status="suspended" label={`${v.strikes} strike${v.strikes > 1 ? "s" : ""}`} />}
                </div>
                <p className="text-sm text-ink-muted">
                  {email} · {v.phone} · {v.location} · since {when(v.createdAt)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{v.tagline || v.description.slice(0, 160)}</p>
                <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
                  <div>
                    <dt className="inline text-ink-muted">ID: </dt>
                    <dd className="inline font-mono">{v.kyc.idNumber || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-muted">KRA PIN: </dt>
                    <dd className="inline font-mono">{v.kyc.kraPin || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-muted">Business reg: </dt>
                    <dd className="inline font-mono">{v.kyc.businessReg || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-muted">Payout: </dt>
                    <dd className="inline">
                      {v.payoutMethod} {v.payoutAccount}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-muted">Categories: </dt>
                    <dd className="inline">{v.categories.map((c) => SHOP_CATEGORY_BY_ID[c]?.name ?? SERVICE_TYPE_BY_ID[c]?.name ?? c).join(", ") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-muted">Products / sales: </dt>
                    <dd className="inline">
                      {products} / {kes(sales)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink/[0.06] pt-3">
              <form action={setVendorStatus} className="flex flex-wrap items-end gap-1.5">
                <input type="hidden" name="id" value={v.id} />
                <input name="note" placeholder="Note to vendor (optional)" defaultValue={v.note ?? ""} className={`${inputCls} h-8 w-56 text-xs`} aria-label="Note" />
                {v.status !== "verified" && (
                  <Submit small name="status" value="verified">
                    Verify vendor
                  </Submit>
                )}
                {v.status === "pending" && (
                  <Submit small tone="danger" name="status" value="rejected">
                    Reject
                  </Submit>
                )}
                {v.status === "verified" && (
                  <Submit small tone="danger" name="status" value="suspended" confirm="Suspend this vendor? Their products will be hidden.">
                    Suspend
                  </Submit>
                )}
              </form>
              <form action={toggleFeatured}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="kind" value="vendor" />
                <Submit small tone="outline" name="on" value={v.featured ? "false" : "true"}>
                  {v.featured ? "Unfeature" : "Feature"}
                </Submit>
              </form>
              <details className="relative">
                <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-full bg-maasai-50 px-3 font-display text-xs font-semibold text-maasai-600">Strike</summary>
                <form action={addVendorStrike} className="absolute left-0 z-20 mt-1 w-72 space-y-2 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-ink/10">
                  <input type="hidden" name="id" value={v.id} />
                  <select name="reason" className={`${inputCls} h-9 text-xs`} aria-label="Reason">
                    <option>Counterfeit or fake item</option>
                    <option>Item not as described</option>
                    <option>Shipped very late</option>
                    <option>No-show for a booking</option>
                    <option>Rude or unsafe conduct</option>
                    <option>Off-platform payment request</option>
                  </select>
                  <Submit small tone="danger" className="w-full" confirm="Give this seller a strike?">
                    Give strike
                  </Submit>
                </form>
              </details>
              {v.strikes > 0 && (
                <form action={clearVendorStrikes}>
                  <input type="hidden" name="id" value={v.id} />
                  <Submit small tone="soft">
                    Clear strikes
                  </Submit>
                </form>
              )}
              <form action={setVendorCommission} className="ml-auto flex items-end gap-1.5">
                <input type="hidden" name="id" value={v.id} />
                <label className="text-xs text-ink-muted">
                  Commission %
                  <input name="rate" type="number" step="0.5" min={0} max={50} defaultValue={v.commissionRate != null ? Math.round(v.commissionRate * 1000) / 10 : ""} placeholder={`default ${Math.round(settings.commissionDefault * 100)}`} className={`${inputCls} mt-0.5 h-8 w-28 text-xs`} />
                </label>
                <Submit small tone="outline">
                  Set
                </Submit>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Products({ status = "pending", q = "" }: { status?: string; q?: string }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (status) where.push(eq(s.products.status, status as "pending"));
  if (q) where.push(ilike(s.products.title, `%${q}%`));
  const rows = await db
    .select({ p: s.products, store: s.vendors.storeName })
    .from(s.products)
    .leftJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.products.updatedAt))
    .limit(120);
  return (
    <>
      <StatusLinks tab="products" value={status} options={[["pending", "To approve"], ["active", "Live"], ["hidden", "Hidden"], ["rejected", "Rejected"], ["", "All"]]} />
      <SearchBox action="/admin/shop" value={q} placeholder="Search product title" hidden={{ tab: "products", ...(status ? { status } : {}) }} />
      {!rows.length && <Empty text="No products here." />}
      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
        {rows.map(({ p, store }) => (
          <li key={p.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(p.images[0], 500, 340)} alt="" className="h-40 w-full bg-sand-100 object-cover" />
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold leading-snug">{p.title}</h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-ink-muted">
                {store} · {p.kind === "service" ? `Service · ${SERVICE_TYPE_BY_ID[p.serviceType ?? ""]?.name ?? ""}` : SHOP_CATEGORY_BY_ID[p.category]?.name ?? p.category} · {p.images.length} photo{p.images.length === 1 ? "" : "s"}
                {p.fulfilledBy === "tembea" ? " · Express" : ""}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{p.description}</p>
              <p className="mt-2 text-sm">
                <strong>{kes(p.price)}</strong>
                {p.kind === "service" ? ` ${SERVICE_UNITS[p.unit] ?? ""}` : ` · stock ${p.stock}`} · sold {p.salesCount}
              </p>
              {p.rejectReason && <p className="mt-1 text-xs text-maasai-600">Rejected: {p.rejectReason}</p>}
              <form action={setProductStatus} className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <input type="hidden" name="id" value={p.id} />
                {p.status !== "active" && (
                  <Submit small name="status" value="active">
                    Approve
                  </Submit>
                )}
                {p.status !== "rejected" && (
                  <>
                    <input name="reason" placeholder="Reason if rejecting" className={`${inputCls} h-8 w-full text-xs`} aria-label="Reject reason" />
                    <Submit small tone="danger" name="status" value="rejected">
                      Reject
                    </Submit>
                  </>
                )}
                {p.status === "active" && (
                  <Submit small tone="outline" name="status" value="hidden">
                    Hide
                  </Submit>
                )}
              </form>
              {p.status === "active" && (
                <form action={toggleFeatured} className="pt-1.5">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="kind" value="product" />
                  <Submit small tone="soft" name="on" value={p.featured ? "false" : "true"}>
                    {p.featured ? "Unfeature" : "Feature on the marketplace"}
                  </Submit>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Orders({ status = "" }: { status?: string }) {
  const db = await getDb();
  const orders = await db
    .select()
    .from(s.orders)
    .where(status ? eq(s.orders.status, status as "paid") : undefined)
    .orderBy(desc(s.orders.createdAt))
    .limit(100);
  const items = orders.length ? await db.select({ i: s.orderItems, store: s.vendors.storeName }).from(s.orderItems).leftJoin(s.vendors, eq(s.vendors.id, s.orderItems.vendorId)).where(inArray(s.orderItems.orderId, orders.map((o) => o.id))) : [];
  return (
    <>
      <StatusLinks tab="orders" value={status} options={[["", "All"], ["pending_payment", "Awaiting payment"], ["paid", "Paid"], ["processing", "Processing"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]]} />
      <DataTable
        rows={orders}
        rowKey={(o) => o.id}
        empty="No orders yet."
        cols={[
          {
            label: "Order",
            cell: (o) => (
              <div>
                <p className="font-mono text-xs">{o.id}</p>
                <p className="font-medium">{o.buyerName}</p>
                <p className="text-xs text-ink-muted">
                  {o.phone} · {o.deliveryMethod === "pickup" ? `Pick-up: ${PICKUP_STATIONS.find((x) => x.id === o.pickupStation)?.name ?? "—"}` : o.deliveryMethod === "none" ? "Bookings only" : `${o.address.town}, ${o.address.county}`}
                </p>
                {o.trackingNumber && <p className="font-mono text-[11px] text-ink-muted">{o.trackingNumber}</p>}
              </div>
            ),
          },
          {
            label: "Items",
            cell: (o) => (
              <ul className="text-xs">
                {items
                  .filter((x) => x.i.orderId === o.id)
                  .map(({ i, store }) => (
                    <li key={i.id} className="py-0.5">
                      {i.qty}× {i.title} <span className="text-ink-muted">({store}) · {i.kind === "service" ? `booking ${i.bookingDate} · ` : ""}{i.fulfilment}</span>
                      {i.returnStatus && (
                        <form action={decideReturn} className="mt-1 flex flex-wrap items-center gap-1 rounded-xl bg-ochre-50 p-1.5">
                          <input type="hidden" name="item" value={i.id} />
                          <span className="text-[11px] font-semibold text-ochre-700">
                            Return {i.returnStatus}: {i.returnReason}
                          </span>
                          {i.returnStatus === "requested" && (
                            <>
                              <Submit small name="decision" value="approved">
                                Approve
                              </Submit>
                              <Submit small tone="danger" name="decision" value="rejected">
                                Decline
                              </Submit>
                            </>
                          )}
                          {i.returnStatus === "approved" && (
                            <Submit small tone="dark" name="decision" value="refunded">
                              Mark refunded
                            </Submit>
                          )}
                        </form>
                      )}
                    </li>
                  ))}
              </ul>
            ),
          },
          { label: "Total", cell: (o) => <span className="font-display font-semibold">{kes(o.total)}</span> },
          { label: "Commission", cell: (o) => kes(o.commission), hideSm: true },
          { label: "Status", cell: (o) => <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} /> },
          { label: "Placed", cell: (o) => when(o.createdAt), hideSm: true },
          {
            label: "Update",
            cell: (o) => (
              <form action={setOrderStatus} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className={`${inputCls} h-8 w-36 text-xs`} aria-label="Order status">
                  {Object.entries(ORDER_STATUS_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <Submit small tone="outline">
                  Save
                </Submit>
              </form>
            ),
          },
          {
            label: "Tracking",
            hideSm: true,
            cell: (o) =>
              o.deliveryMethod !== "none" && ["paid", "processing", "shipped"].includes(o.status) ? (
                <form action={addTrackingEvent} className="flex flex-wrap items-center gap-1">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" className={`${inputCls} h-8 w-32 text-xs`} aria-label="Tracking step">
                    <option value="in_transit">On the way</option>
                    <option value="ready">At pick-up station</option>
                    <option value="out">Out for delivery</option>
                    <option value="delayed">Delayed</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <input name="location" placeholder="Where" className={`${inputCls} h-8 w-24 text-xs`} aria-label="Location" />
                  <Submit small tone="outline">
                    Add
                  </Submit>
                </form>
              ) : (
                <span className="text-xs text-ink-muted">—</span>
              ),
          },
        ]}
      />
    </>
  );
}
