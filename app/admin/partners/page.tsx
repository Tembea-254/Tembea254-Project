import { desc, eq, sql } from "drizzle-orm";
import { Eye, Handshake, MousePointerClick, Package } from "lucide-react";
import { decideLead, saveAd, saveOffer, savePartner, toggleAd, toggleOffer, togglePartner } from "./actions";
import { Submit, UploadField } from "@/components/admin/client";
import { DataTable, Empty, Field, FilterTabs, PageHeader, Panel, Stat, StatusBadge, inputCls, kes, textareaCls, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { PLACES } from "@/lib/data/places";

export const metadata = { title: "Partners & ads" };
export const dynamic = "force-dynamic";

const TABS = ["partners", "packages", "ads", "leads"] as const;
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

export default async function PartnersAdmin({ searchParams }: { searchParams: { tab?: string; ok?: string; error?: string; edit?: string } }) {
  const tab = TABS.includes(searchParams.tab as (typeof TABS)[number]) ? searchParams.tab! : "partners";
  const db = await getDb();
  const [partners, totals, leads] = await Promise.all([
    db.select().from(s.partners).orderBy(desc(s.partners.sponsored), s.partners.name),
    db.select({ imp: sql<number>`coalesce(sum(${s.ads.impressions}),0)::int`, clicks: sql<number>`coalesce(sum(${s.ads.clicks}),0)::int` }).from(s.ads),
    db.select({ n: sql<number>`count(*)::int` }).from(s.applications).where(sql`${s.applications.kind} = 'partner' and ${s.applications.status} = 'pending'`),
  ]);
  const offerClicks = await db.select({ n: sql<number>`coalesce(sum(${s.partnerOffers.clicks}),0)::int` }).from(s.partnerOffers);

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="Partners & ads" text="Tour operators, stays and car hire that list packages in the AI planner, and the sponsored cards shown in the app. Free users see an ad about every 20 seconds, Pro about every 5 minutes (change it in Settings)." />
      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))]">
        <Stat label="Partners" value={partners.filter((p) => p.active).length} hint={`${partners.filter((p) => p.sponsored).length} sponsored`} icon={Handshake} />
        <Stat label="Ad impressions" value={totals[0].imp.toLocaleString()} icon={Eye} tone="violet" />
        <Stat label="Ad clicks" value={totals[0].clicks.toLocaleString()} hint={`CTR ${pct(totals[0].clicks, totals[0].imp)}`} icon={MousePointerClick} tone="ochre" />
        <Stat label="Package clicks" value={offerClicks[0].n.toLocaleString()} hint="Travellers sent to partners" icon={Package} tone="ink" />
      </div>
      <FilterTabs
        base="/admin/partners"
        param="tab"
        value={tab === "partners" ? "" : tab}
        options={[
          { value: "", label: "Partners" },
          { value: "packages", label: "Packages" },
          { value: "ads", label: "Ads" },
          { value: "leads", label: "Leads", count: leads[0].n },
        ]}
      />
      <Flash ok={searchParams.ok} error={searchParams.error} />
      {tab === "partners" && <Partners partners={partners} editId={searchParams.edit} />}
      {tab === "packages" && <Packages partners={partners} editId={searchParams.edit} />}
      {tab === "ads" && <Ads partners={partners} editId={searchParams.edit} />}
      {tab === "leads" && <Leads />}
    </>
  );
}

type Partner = typeof s.partners.$inferSelect;

function Toggle({ action, id, field, on, labels }: { action: (f: FormData) => void; id: string; field?: string; on: boolean; labels: [string, string] }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {field && <input type="hidden" name="field" value={field} />}
      <input type="hidden" name="value" value={on ? "0" : "1"} />
      <Submit small tone={on ? "outline" : "soft"}>{on ? labels[1] : labels[0]}</Submit>
    </form>
  );
}

function Partners({ partners, editId }: { partners: Partner[]; editId?: string }) {
  const edit = partners.find((p) => p.id === editId);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      <Panel title="Partners">
        <DataTable
          rows={partners}
          rowKey={(p) => p.id}
          empty="No partners yet."
          cols={[
            {
              label: "Partner",
              cell: (p) => (
                <span className="block">
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-xs text-ink-muted">
                    {p.kind} · {Math.round(p.commission * 100)}% commission
                  </span>
                </span>
              ),
            },
            {
              label: "Labels",
              cell: (p) => (
                <span className="flex flex-wrap gap-1">
                  {p.sponsored && <StatusBadge status="sponsored" label="Sponsored" />}
                  {p.demo && <StatusBadge status="draft" label="Sample" />}
                  {!p.active && <StatusBadge status="hidden" label="Hidden" />}
                </span>
              ),
            },
            {
              label: "",
              cell: (p) => (
                <span className="flex flex-wrap gap-1.5">
                  <a href={`/admin/partners?edit=${p.id}`} className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 text-xs font-semibold">
                    Edit
                  </a>
                  <Toggle action={togglePartner} id={p.id} field="sponsored" on={p.sponsored} labels={["Sponsor", "Unsponsor"]} />
                  <Toggle action={togglePartner} id={p.id} field="active" on={p.active} labels={["Show", "Hide"]} />
                </span>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={edit ? `Edit ${edit.name}` : "Add a partner"}>
        <form action={savePartner} className="grid gap-3" key={edit?.id ?? "new"}>
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <Field label="Business name">
            <input name="name" required defaultValue={edit?.name} className={inputCls} placeholder="e.g. Bonfire Adventures" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select name="kind" defaultValue={edit?.kind ?? "operator"} className={inputCls}>
                <option value="operator">Tour operator</option>
                <option value="stay">Hotel / lodge</option>
                <option value="transport">Car hire / transfers</option>
              </select>
            </Field>
            <Field label="Commission %">
              <input name="commission" type="number" min={0} max={50} step="0.5" defaultValue={edit ? edit.commission * 100 : 10} className={inputCls} />
            </Field>
          </div>
          <Field label="Website">
            <input name="website" defaultValue={edit?.website} className={inputCls} placeholder="https://" />
          </Field>
          <Field label="Phone / WhatsApp">
            <input name="phone" defaultValue={edit?.phone} className={inputCls} />
          </Field>
          <Field label="One-line description">
            <textarea name="blurb" rows={2} defaultValue={edit?.blurb} className={textareaCls} />
          </Field>
          <Field group label="Logo">
            <UploadField name="logo" defaultValue={edit?.logo ?? undefined} label="Upload logo" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sponsored" defaultChecked={edit?.sponsored} className="accent-savanna-600" /> Sponsored (shown first, always labelled)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="demo" defaultChecked={edit?.demo} className="accent-savanna-600" /> Sample data (labelled &quot;Sample listing&quot;)
          </label>
          <Submit className="h-11">{edit ? "Save partner" : "Add partner"}</Submit>
        </form>
      </Panel>
    </div>
  );
}

async function Packages({ partners, editId }: { partners: Partner[]; editId?: string }) {
  const db = await getDb();
  const offers = await db.select().from(s.partnerOffers).orderBy(desc(s.partnerOffers.createdAt));
  const name = Object.fromEntries(partners.map((p) => [p.id, p.name]));
  const edit = offers.find((o) => o.id === editId);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Panel title="Packages, stays and transport">
        <DataTable
          rows={offers}
          rowKey={(o) => o.id}
          empty="No packages yet."
          cols={[
            {
              label: "Package",
              cell: (o) => (
                <span className="block">
                  <span className="block font-medium">{o.title}</span>
                  <span className="text-xs text-ink-muted">
                    {name[o.partnerId] ?? "?"} · {o.days} day{o.days > 1 ? "s" : ""} · {o.tier}
                  </span>
                </span>
              ),
            },
            { label: "Price", cell: (o) => `${kes(o.pricePerPerson)}${o.kind === "transport" ? "/day" : "/pp"}` },
            { label: "Clicks", cell: (o) => o.clicks, hideSm: true },
            {
              label: "",
              cell: (o) => (
                <span className="flex flex-wrap gap-1.5">
                  <a href={`/admin/partners?tab=packages&edit=${o.id}`} className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 text-xs font-semibold">
                    Edit
                  </a>
                  <Toggle action={toggleOffer} id={o.id} on={o.active} labels={["Show", "Hide"]} />
                </span>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={edit ? "Edit package" : "Add a package"}>
        <form action={saveOffer} className="grid gap-3" key={edit?.id ?? "new"}>
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <Field label="Partner">
            <select name="partnerId" required defaultValue={edit?.partnerId ?? ""} className={inputCls}>
              <option value="" disabled>
                Choose…
              </option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input name="title" required defaultValue={edit?.title} className={inputCls} placeholder="3-day Maasai Mara safari" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <select name="kind" defaultValue={edit?.kind ?? "operator"} className={inputCls}>
                <option value="operator">Package</option>
                <option value="stay">Stay</option>
                <option value="transport">Transport</option>
              </select>
            </Field>
            <Field label="Days">
              <input name="days" type="number" min={1} defaultValue={edit?.days ?? 3} className={inputCls} />
            </Field>
            <Field label="Level">
              <select name="tier" defaultValue={edit?.tier ?? "mid"} className={inputCls}>
                <option value="budget">Budget</option>
                <option value="mid">Mid-range</option>
                <option value="luxury">Premium</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="KES per person" hint="Transport: per vehicle per day">
              <input name="pricePerPerson" type="number" min={0} required defaultValue={edit?.pricePerPerson} className={inputCls} />
            </Field>
            <Field label="Rating">
              <input name="rating" type="number" min={0} max={5} step="0.1" defaultValue={edit?.rating ?? ""} className={inputCls} />
            </Field>
            <Field label="Reviews">
              <input name="reviews" type="number" min={0} defaultValue={edit?.reviews ?? 0} className={inputCls} />
            </Field>
          </div>
          <Field label="Places it covers">
            <select name="places" multiple required defaultValue={edit?.places ?? []} className="h-36 w-full rounded-2xl border border-ink/10 bg-white p-2 text-sm">
              {PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Includes" hint="One per line">
            <textarea name="includes" rows={3} defaultValue={edit?.includes.join("\n")} className={textareaCls} />
          </Field>
          <Field label="Not included" hint="One per line">
            <textarea name="excludes" rows={2} defaultValue={edit?.excludes.join("\n")} className={textareaCls} />
          </Field>
          <Field label="Booking link" hint="The partner's own page for this package">
            <input name="url" defaultValue={edit?.url} className={inputCls} placeholder="https://" />
          </Field>
          <Submit className="h-11">{edit ? "Save package" : "Add package"}</Submit>
        </form>
      </Panel>
    </div>
  );
}

async function Ads({ partners, editId }: { partners: Partner[]; editId?: string }) {
  const db = await getDb();
  const ads = await db.select().from(s.ads).orderBy(desc(s.ads.createdAt));
  const name = Object.fromEntries(partners.map((p) => [p.id, p.name]));
  const edit = ads.find((a) => a.id === editId);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      <Panel title="Sponsored cards">
        <DataTable
          rows={ads}
          rowKey={(a) => a.id}
          empty="No ads yet."
          cols={[
            {
              label: "Ad",
              cell: (a) => (
                <span className="block">
                  <span className="block font-medium">{a.headline}</span>
                  <span className="text-xs text-ink-muted">
                    {a.partnerId ? name[a.partnerId] : "Tembea house ad"} · {a.placement}
                  </span>
                </span>
              ),
            },
            { label: "Shown", cell: (a) => a.impressions.toLocaleString() },
            { label: "Clicks", cell: (a) => `${a.clicks} (${pct(a.clicks, a.impressions)})` },
            {
              label: "",
              cell: (a) => (
                <span className="flex flex-wrap gap-1.5">
                  <a href={`/admin/partners?tab=ads&edit=${a.id}`} className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 text-xs font-semibold">
                    Edit
                  </a>
                  <Toggle action={toggleAd} id={a.id} on={a.active} labels={["Run", "Pause"]} />
                </span>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={edit ? "Edit ad" : "New ad"}>
        <form action={saveAd} className="grid gap-3" key={edit?.id ?? "new"}>
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <Field label="Advertiser">
            <select name="partnerId" defaultValue={edit?.partnerId ?? ""} className={inputCls}>
              <option value="">Tembea (house ad)</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Headline">
            <input name="headline" required maxLength={90} defaultValue={edit?.headline} className={inputCls} />
          </Field>
          <Field label="Text">
            <textarea name="body" rows={2} maxLength={160} defaultValue={edit?.body} className={textareaCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button">
              <input name="cta" defaultValue={edit?.cta ?? "Learn more"} className={inputCls} />
            </Field>
            <Field label="Show on">
              <select name="placement" defaultValue={edit?.placement ?? "all"} className={inputCls}>
                {["all", "planner", "vr", "translator", "community", "marketplace", "dashboard"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Link">
            <input name="url" required defaultValue={edit?.url} className={inputCls} placeholder="https://" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input name="startsAt" type="date" defaultValue={edit?.startsAt?.toISOString().slice(0, 10)} className={inputCls} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="date" defaultValue={edit?.endsAt?.toISOString().slice(0, 10)} className={inputCls} />
            </Field>
          </div>
          <Field group label="Image">
            <UploadField name="image" defaultValue={edit?.image ?? undefined} label="Upload image" />
          </Field>
          <Submit className="h-11">{edit ? "Save ad" : "Create ad"}</Submit>
        </form>
      </Panel>
    </div>
  );
}

async function Leads() {
  const db = await getDb();
  const rows = await db.select().from(s.applications).where(eq(s.applications.kind, "partner")).orderBy(desc(s.applications.createdAt)).limit(100);
  if (!rows.length) return <Empty text="No enquiries yet. Businesses apply from the Advertise with Tembea page (/partners)." />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((r) => {
        const d = r.data as Record<string, string>;
        return (
          <article key={r.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-semibold">{d.company}</p>
                <p className="text-xs text-ink-muted">
                  {d.name} · {d.email} · {d.phone} · {when(r.createdAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {d.kind} · interested in: {d.interest || "—"} {d.website && <>· <a href={d.website} target="_blank" rel="noreferrer" className="text-savanna-700 underline">{d.website}</a></>}
            </p>
            {d.message && <p className="mt-2 rounded-2xl bg-sand-50 p-3 text-sm">{d.message}</p>}
            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={decideLead}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Submit small>Create partner</Submit>
                </form>
                <form action={decideLead}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Submit small tone="outline">Close lead</Submit>
                </form>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
