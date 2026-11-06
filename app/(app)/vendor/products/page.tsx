import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { saveProduct, setProductVisibility } from "../actions";
import { Submit, UploadField } from "@/components/admin/client";
import { DataTable, Field, Panel, StatusBadge, inputCls, kes, mediaSrc, textareaCls } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { HUB_NAMES, SERVICE_TYPES, SERVICE_TYPE_BY_ID, SERVICE_UNITS, SHOP_CATEGORIES, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { ListingKind } from "@/components/shop/listing-kind";
import { getDb, schema as s } from "@/lib/db";
import { myVendor } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";
import { commissionFor, getSettings } from "@/lib/settings";

export const metadata = { title: "My products" };

export default async function VendorProducts({ searchParams }: { searchParams: { edit?: string; ok?: string; error?: string } }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "rejected") redirect("/vendor");
  const db = await getDb();
  const settings = await getSettings();
  const rows = await db.select().from(s.products).where(eq(s.products.vendorId, v.id)).orderBy(desc(s.products.updatedAt));
  const editing = searchParams.edit === "new" ? null : searchParams.edit ? (await db.select().from(s.products).where(and(eq(s.products.id, searchParams.edit), eq(s.products.vendorId, v.id))))[0] : undefined;
  const showForm = searchParams.edit !== undefined;

  return (
    <>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      {showForm ? (
        <Panel title={editing ? `Edit "${editing.title}"` : "New listing"} actions={<Link href="/vendor/products" className="text-sm font-semibold text-ink-muted">Cancel</Link>}>
          <form action={saveProduct} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <Field label="Product name" className="sm:col-span-2">
              <input name="title" required maxLength={100} defaultValue={editing?.title} className={inputCls} placeholder="e.g. Maasai beaded collar, or Full-day Mara game drive" />
            </Field>
            <Field group label="Photos (up to 8 — the first is the cover)" className="sm:col-span-2">
              <UploadField name="images" multiple defaultValue={editing?.images.join("\n")} label="Add photos" />
            </Field>
            <ListingKind
              initial={(editing?.kind as "product" | "service") ?? (v.sellerType === "pro" ? "service" : "product")}
              allowed={v.sellerType === "both" ? ["product", "service"] : v.sellerType === "pro" ? ["service"] : ["product"]}
              product={
                <>
                  <Field label="Category">
                    <select name="category" defaultValue={editing?.kind === "product" ? editing.category : v.categories.find((c) => SHOP_CATEGORY_BY_ID[c])} className={inputCls}>
                      {SHOP_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {Math.round(commissionFor(settings, c.id, v.commissionRate) * 100)}% commission
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Made in">
                    <input name="madeIn" defaultValue={editing?.madeIn ?? v.location} className={inputCls} placeholder="e.g. Narok" />
                  </Field>
                  <Field label="Price (KES)">
                    <input name="price" type="number" min={50} defaultValue={editing?.price} className={inputCls} />
                  </Field>
                  <Field label="Was (KES, optional)" hint="Shows a discount if higher than the price">
                    <input name="compareAt" type="number" min={0} defaultValue={editing?.compareAt ?? ""} className={inputCls} />
                  </Field>
                  <Field label="In stock">
                    <input name="stock" type="number" min={0} max={9999} defaultValue={editing?.stock ?? 1} className={inputCls} />
                  </Field>
                  <Field label="Who ships it?" hint="Tembea Express: drop stock at a Tembea hub and we deliver faster (Express badge).">
                    <select name="fulfilledBy" defaultValue={editing?.fulfilledBy ?? "seller"} className={inputCls}>
                      <option value="seller">I pack and send it</option>
                      <option value="tembea">Tembea Express (stocked at a Tembea hub)</option>
                    </select>
                  </Field>
                </>
              }
              service={
                <>
                  <Field label="Type of service">
                    <select name="serviceType" defaultValue={editing?.serviceType ?? v.categories.find((c) => SERVICE_TYPE_BY_ID[c]) ?? "guides"} className={inputCls}>
                      {SERVICE_TYPES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {Math.round(commissionFor(settings, c.id, v.commissionRate) * 100)}% commission
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Area">
                    <select name="hub" defaultValue={editing?.hub ?? v.hub ?? ""} className={inputCls}>
                      {Object.entries(HUB_NAMES).map(([id, n]) => (
                        <option key={id} value={id}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Price (KES)">
                    <input name="servicePrice" type="number" min={50} defaultValue={editing?.price} className={inputCls} />
                  </Field>
                  <Field label="Charged">
                    <select name="unit" defaultValue={editing?.unit && editing.unit !== "item" ? editing.unit : "day"} className={inputCls}>
                      {Object.entries(SERVICE_UNITS)
                        .filter(([k]) => k !== "item")
                        .map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Base / meeting point">
                    <input name="serviceMadeIn" defaultValue={editing?.madeIn ?? v.location} className={inputCls} placeholder="e.g. Talek Gate" />
                  </Field>
                  <Field label="Max group size (optional)">
                    <input name="capacity" type="number" min={1} max={200} defaultValue={editing?.capacity ?? ""} className={inputCls} />
                  </Field>
                  <Field label="Languages (comma separated)" className="sm:col-span-2">
                    <input name="languages" defaultValue={editing?.languages.join(", ")} className={inputCls} placeholder="English, Swahili, Maa" />
                  </Field>
                </>
              }
            />
            <Field label="Tags (comma separated)">
              <input name="tags" defaultValue={editing?.tags.join(", ")} className={inputCls} placeholder="gift, handmade, maasai" />
            </Field>
            <Field label="Description" className="sm:col-span-2" hint="Materials, size, how it's made, care. Honest descriptions mean fewer returns.">
              <textarea name="description" rows={5} defaultValue={editing?.description} className={textareaCls} />
            </Field>
            {editing?.rejectReason && <p className="rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700 sm:col-span-2">Not approved last time: {editing.rejectReason}</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Submit>{settings.productApproval ? "Send for approval" : "Publish"}</Submit>
              <Submit tone="outline" name="draft" value="1">
                Save as draft
              </Submit>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="mb-4 flex justify-end">
          <Link href="/vendor/products?edit=new" className="inline-flex h-10 items-center gap-2 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> New listing
          </Link>
        </div>
      )}
      <div className={showForm ? "mt-6" : ""}>
        <DataTable
          rows={rows}
          rowKey={(p) => p.id}
          empty="No products yet. Add your first one."
          cols={[
            {
              label: "Product",
              cell: (p) => (
                <span className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images[0] && <img src={mediaSrc(p.images[0], 120, 120)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.title}</span>
                    <span className="text-xs text-ink-muted">{p.kind === "service" ? `Service · ${SERVICE_TYPE_BY_ID[p.serviceType ?? ""]?.name ?? ""}` : SHOP_CATEGORY_BY_ID[p.category]?.name}{p.fulfilledBy === "tembea" ? " · Express" : ""}</span>
                  </span>
                </span>
              ),
            },
            { label: "Price", cell: (p) => `${kes(p.price)}${p.kind === "service" ? ` ${SERVICE_UNITS[p.unit] ?? ""}` : ""}` },
            { label: "Stock", cell: (p) => (p.kind === "service" ? "—" : p.stock ? p.stock : <span className="text-maasai-600">Sold out</span>), hideSm: true },
            { label: "Sold", cell: (p) => p.salesCount, hideSm: true },
            { label: "Status", cell: (p) => <StatusBadge status={p.status} label={p.status === "pending" ? "Awaiting approval" : undefined} /> },
            {
              label: "",
              cell: (p) => (
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Link href={`/vendor/products?edit=${p.id}`} className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">
                    Edit
                  </Link>
                  {(p.status === "active" || p.status === "hidden") && (
                    <form action={setProductVisibility}>
                      <input type="hidden" name="id" value={p.id} />
                      <Submit small tone="soft" name="to" value={p.status === "active" ? "hidden" : "show"}>
                        {p.status === "active" ? "Hide" : "Show"}
                      </Submit>
                    </form>
                  )}
                  <form action={setProductVisibility}>
                    <input type="hidden" name="id" value={p.id} />
                    <Submit small tone="danger" name="to" value="delete" confirm={`Remove "${p.title}"?`}>
                      Remove
                    </Submit>
                  </form>
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
