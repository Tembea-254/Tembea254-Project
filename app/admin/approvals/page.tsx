import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { BadgeCheck, Clapperboard, ExternalLink, Film, Flag, Inbox, MapPin, Package, Phone, Radio, ShieldCheck, Star, Store, Wallet, Wrench } from "lucide-react";
import { decideApplication, setProductStatus, setVendorStatus } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, PageHeader, inputCls, kes, mediaSrc, when } from "@/components/admin/kit";
import { CREATOR_FILMS, CREATOR_GEAR, labelOf, type CreatorApplication } from "@/lib/data/creators";
import { HUB_NAMES, SERVICE_TYPE_BY_ID, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { adminQueues } from "@/lib/repo/admin-queues";
import { cn } from "@/lib/utils";

export const metadata = { title: "Approvals inbox" };

const SELLER_TYPE: Record<string, string> = { maker: "Sells products", pro: "Sells services", both: "Products & services" };
const catName = (c: string) => SHOP_CATEGORY_BY_ID[c]?.name ?? SERVICE_TYPE_BY_ID[c]?.name ?? c;
const yt = (url: string) => url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1];

export default async function ApprovalsInbox({ searchParams }: { searchParams: { tab?: string } }) {
  const q = await adminQueues();
  const tabs = [
    { id: "sellers", label: "Seller applications", n: q.vendors, icon: Store },
    { id: "creators", label: "Creator applications", n: q.creatorApps, icon: Clapperboard },
    { id: "products", label: "Products & services", n: q.products, icon: Package },
  ];
  const tab = tabs.some((t) => t.id === searchParams.tab) ? searchParams.tab! : q.vendors || !q.creatorApps ? "sellers" : "creators";
  const other = [
    { label: "Videos to review", n: q.submissions, href: "/admin/creators", icon: Film },
    { label: "Live walks to approve", n: q.live, href: "/admin/creators?tab=live", icon: Radio },
    { label: "Reviews to moderate", n: q.reviews, href: "/admin/reviews", icon: Star },
    { label: "Reported posts", n: q.reports, href: "/admin/community?tab=reports", icon: Flag },
    { label: "Payouts to process", n: q.payouts, href: "/admin/payments?tab=payouts", icon: Wallet },
    { label: "Hire-provider applications", n: q.providerApps, href: "/admin/marketplace?tab=applications", icon: Wrench },
  ];
  return (
    <>
      <PageHeader eyebrow="Approvals" title="Approvals inbox" text="Everyone waiting for a decision, in one place. Approving a seller or creator opens their workspace in the sidebar and sends them a notification." />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <nav className="scrollbar-none -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Queues">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={`/admin/approvals?tab=${t.id}`}
                className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 font-display text-sm font-semibold transition-colors", tab === t.id ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card hover:text-ink")}
              >
                <t.icon className="h-4 w-4" /> {t.label}
                <span className={cn("rounded-full px-1.5 text-[11px]", tab === t.id ? "bg-white/20" : t.n ? "bg-ochre-400 text-ink" : "bg-sand-100")}>{t.n}</span>
              </Link>
            ))}
          </nav>
          {tab === "sellers" && <Sellers />}
          {tab === "creators" && <Creators />}
          {tab === "products" && <Products />}
        </div>
        <aside className="space-y-3">
          <section className="rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
              <Inbox className="h-4 w-4 text-savanna-600" /> Other queues
            </h2>
            <ul className="divide-y divide-ink/[0.06]">
              {other.map((o) => (
                <li key={o.label}>
                  <Link href={o.href} className="flex items-center gap-3 py-2.5 text-sm hover:text-savanna-700">
                    <o.icon className="h-4 w-4 text-ink-muted" />
                    <span className="flex-1">{o.label}</span>
                    <span className={o.n ? "rounded-full bg-ochre-400 px-2 py-0.5 font-display text-xs font-bold text-ink" : "text-xs text-ink-muted"}>{o.n || "—"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-3xl bg-ink p-4 text-sm text-white/80">
            <p className="flex items-center gap-2 font-display font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-savanna-400" /> Verification checklist
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              <li>National ID is 6–10 digits and the KRA PIN matches A/P + 9 digits + letter.</li>
              <li>The M-Pesa number is a real Safaricom line (call it if unsure).</li>
              <li>Creators: watch the sample — steady, at least 1080p, no faces without consent.</li>
              <li>Drone pilots must have a KCAA remote pilot licence.</li>
              <li>Add a short note when you reject, so they know what to fix.</li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Store; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink-soft">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

async function Sellers() {
  const db = await getDb();
  const rows = await db
    .select({ v: s.vendors, name: s.users.name, email: s.users.email })
    .from(s.vendors)
    .leftJoin(s.users, eq(s.users.id, s.vendors.userId))
    .where(eq(s.vendors.status, "pending"))
    .orderBy(desc(s.vendors.createdAt))
    .limit(50);
  if (!rows.length) return <Empty text="No seller applications waiting. New ones appear here as soon as someone answers “Would you like to sell on Tembea254?”." />;
  return (
    <ul className="space-y-4">
      {rows.map(({ v, name, email }) => (
        <li key={v.id} className="overflow-hidden rounded-3xl bg-white shadow-card">
          <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
            {v.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(v.logo, 120, 120)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-savanna-50 font-display text-xl font-bold text-savanna-700">{v.storeName.slice(0, 1)}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold">{v.storeName}</h3>
                <span className="rounded-full bg-ochre-50 px-2 py-0.5 text-[11px] font-semibold text-ochre-700">Waiting · {when(v.createdAt)}</span>
              </div>
              <p className="text-sm text-ink-muted">
                {name || "—"} · {email} · {SELLER_TYPE[v.sellerType] ?? v.sellerType}
              </p>
              {v.tagline && <p className="mt-1 text-sm">{v.tagline}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {v.categories.map((c) => (
                  <span key={c} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs text-ink-soft">
                    {catName(c)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-x-6 gap-y-2 border-t border-ink/[0.06] bg-sand-50/60 p-4 sm:grid-cols-2 sm:p-5">
            <Row icon={MapPin}>
              {v.location || "—"}
              {v.hub ? ` · serves ${HUB_NAMES[v.hub] ?? v.hub}` : ""}
            </Row>
            <Row icon={Phone}>
              Orders {v.phone} · Payouts {v.payoutAccount || v.phone}
            </Row>
            <Row icon={BadgeCheck}>
              ID <b className="font-mono">{v.kyc.idNumber || "—"}</b> · KRA PIN <b className="font-mono">{v.kyc.kraPin || "—"}</b>
            </Row>
            <Row icon={Store}>{v.kyc.businessReg ? `Business reg. ${v.kyc.businessReg}` : "Individual seller (no business registration)"}</Row>
          </div>
          <form action={setVendorStatus} className="flex flex-wrap items-center gap-2 border-t border-ink/[0.06] p-4 sm:p-5">
            <input type="hidden" name="id" value={v.id} />
            <input name="note" placeholder="Note to the seller (needed if you reject)" className={`${inputCls} h-10 min-w-0 flex-1 sm:max-w-sm`} aria-label="Note to the seller" />
            <Submit name="status" value="verified">
              <BadgeCheck className="h-4 w-4" /> Approve & verify
            </Submit>
            <Submit tone="danger" name="status" value="rejected" confirm={`Reject ${v.storeName}?`}>
              Reject
            </Submit>
          </form>
        </li>
      ))}
    </ul>
  );
}

async function Creators() {
  const db = await getDb();
  const rows = await db
    .select({ a: s.applications, name: s.users.name, email: s.users.email, image: s.users.image })
    .from(s.applications)
    .leftJoin(s.users, eq(s.users.id, s.applications.userId))
    .where(and(eq(s.applications.kind, "creator"), eq(s.applications.status, "pending")))
    .orderBy(desc(s.applications.createdAt))
    .limit(50);
  if (!rows.length) return <Empty text="No creator applications waiting. New ones appear here when someone answers “Would you like to be a Tembea254 creator?”." />;
  return (
    <ul className="space-y-4">
      {rows.map(({ a, email }) => {
        const d = a.data as CreatorApplication;
        const sample = d.sample ?? "";
        const ytId = sample ? yt(sample) : undefined;
        return (
          <li key={a.id} className="overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[1fr_280px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{d.name}</h3>
                  {d.channel && <span className="text-sm font-semibold text-dusk-500">{d.channel}</span>}
                  <span className="rounded-full bg-ochre-50 px-2 py-0.5 text-[11px] font-semibold text-ochre-700">Waiting · {when(a.createdAt)}</span>
                </div>
                <p className="text-sm text-ink-muted">
                  {email} · {d.phone}
                  {d.hub ? ` · ${HUB_NAMES[d.hub] ?? d.hub}` : ""}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm">{d.about}</p>
                <div className="mt-3 space-y-1.5">
                  <Row icon={Film}>{d.films.map((x) => labelOf(CREATOR_FILMS, x)).join(" · ")}</Row>
                  <Row icon={Clapperboard}>
                    {d.gear.map((x) => labelOf(CREATOR_GEAR, x)).join(" · ")}
                    {d.droneLicence ? ` · KCAA licence ${d.droneLicence}` : ""}
                  </Row>
                </div>
                {!!Object.keys(d.links ?? {}).length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(d.links).map(([k, url]) => (
                      <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold capitalize text-ink-soft hover:bg-sand-200">
                        {k} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div>
                {ytId ? (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${ytId}`} title="Sample clip" className="aspect-video w-full rounded-2xl" allowFullScreen />
                ) : sample && /\.(mp4|webm|mov)(\?|$)/i.test(sample) ? (
                  <video src={sample} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-ink" />
                ) : sample ? (
                  <a href={sample} target="_blank" rel="noopener noreferrer" className="grid aspect-video w-full place-items-center rounded-2xl bg-sand-100 text-sm font-semibold text-ink-soft">
                    Open sample clip <ExternalLink className="ml-1 inline h-4 w-4" />
                  </a>
                ) : (
                  <div className="grid aspect-video w-full place-items-center rounded-2xl bg-sand-100 text-xs text-ink-muted">No sample — check their links</div>
                )}
              </div>
            </div>
            <form action={decideApplication} className="flex flex-wrap items-center gap-2 border-t border-ink/[0.06] p-4 sm:p-5">
              <input type="hidden" name="id" value={a.id} />
              <input name="note" placeholder="Note to the creator (needed if you reject)" className={`${inputCls} h-10 min-w-0 flex-1 sm:max-w-sm`} aria-label="Note to the creator" />
              <Submit name="decision" value="approve">
                <BadgeCheck className="h-4 w-4" /> Approve creator
              </Submit>
              <Submit tone="danger" name="decision" value="reject" confirm={`Reject ${d.name}?`}>
                Reject
              </Submit>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

async function Products() {
  const db = await getDb();
  const rows = await db
    .select({ p: s.products, store: s.vendors.storeName, vstatus: s.vendors.status })
    .from(s.products)
    .leftJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
    .where(inArray(s.products.status, ["pending"]))
    .orderBy(desc(s.products.createdAt))
    .limit(60);
  if (!rows.length) return <Empty text="No products or services waiting for approval." />;
  return (
    <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
      {rows.map(({ p, store, vstatus }) => (
        <li key={p.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.images[0] ? <img src={mediaSrc(p.images[0], 600, 360)} alt="" className="aspect-[5/3] w-full object-cover" /> : <div className="aspect-[5/3] bg-sand-100" />}
          <div className="flex flex-1 flex-col p-4">
            <p className="text-xs text-ink-muted">
              {store ?? "—"} {vstatus !== "verified" && <span className="font-semibold text-ochre-700">· seller not verified</span>}
            </p>
            <h3 className="mt-0.5 line-clamp-2 font-display font-bold">{p.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {catName(p.kind === "service" ? p.serviceType ?? p.category : p.category)} · <span className="font-semibold text-ink">{kes(p.price)}</span>
              {p.kind === "service" ? ` / ${p.unit}` : ` · ${p.stock} in stock`}
            </p>
            <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{p.description}</p>
            <form action={setProductStatus} className="mt-auto flex flex-wrap items-center gap-2 pt-4">
              <input type="hidden" name="id" value={p.id} />
              <input name="reason" placeholder="Reason if rejecting" className={`${inputCls} h-9 min-w-0 flex-1 text-xs`} aria-label="Reason" />
              <Submit small name="status" value="active">
                Approve
              </Submit>
              <Submit small tone="danger" name="status" value="rejected">
                Reject
              </Submit>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
