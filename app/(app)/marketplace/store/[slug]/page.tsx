import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, MapPin, MessageCircle, PackageCheck, ShieldCheck, Star } from "lucide-react";
import { mediaUrl } from "@/components/shop/media";
import { StoreProducts } from "@/components/shop/store-products";
import { Stars } from "@/components/shop/ui";
import { HUB_NAMES } from "@/lib/data/shop";
import { getStore } from "@/lib/repo/shop";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const st = await getStore(params.slug);
  return { title: st ? st.vendor.storeName.replace(" (demo)", "") : "Store", description: st?.vendor.tagline };
}

const KIND: Record<string, string> = { maker: "Maker", pro: "Local pro", both: "Maker & pro" };

export default async function StorePage({ params }: { params: { slug: string } }) {
  const st = await getStore(params.slug);
  if (!st) notFound();
  const v = st.vendor;
  const sc = st.score;
  const since = new Date(v.verifiedAt ?? v.createdAt).getFullYear();
  return (
    <div className="container-page py-5 sm:py-8">
      <Link href="/marketplace" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Marketplace
      </Link>
      <header className="overflow-hidden rounded-[1.75rem] bg-white shadow-card">
        <div className="relative h-36 bg-ink sm:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(v.banner || st.products[0]?.image) && <img src={mediaUrl(v.banner || st.products[0]?.image, 1600, 500)} alt="" className="h-full w-full object-cover opacity-90" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {v.note === "demo" && <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">Demo store</span>}
        </div>
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {v.logo ? <img src={mediaUrl(v.logo, 200, 200)} alt="" className="-mt-12 h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-card" /> : <span className="-mt-12 grid h-24 w-24 place-items-center rounded-3xl border-4 border-white bg-ochre-400 font-display text-3xl font-bold shadow-card">{v.storeName[0]}</span>}
          <div className="min-w-0 flex-1 pt-3">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              {KIND[v.sellerType] ?? "Seller"}
              {v.hub ? ` · ${HUB_NAMES[v.hub] ?? v.hub}` : ""}
            </p>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
              {v.storeName.replace(" (demo)", "")}
              <span className="inline-flex items-center gap-1 rounded-full bg-savanna-50 px-2.5 py-1 font-display text-xs font-semibold text-savanna-700">
                <BadgeCheck className="h-4 w-4" /> Verified
              </span>
            </h1>
            <p className="text-sm text-ink-muted">{v.tagline}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
              <Stars value={v.ratingAvg} count={v.ratingCount} size="xs" />
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {v.location}
              </span>
              <span>On Tembea since {since}</span>
            </p>
          </div>
          {st.ownerHandle && (
            <Link href={`/community/u/${st.ownerHandle}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 font-display text-sm font-semibold text-white">
              <MessageCircle className="h-4 w-4" /> See their posts
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 border-t border-ink/[0.06] sm:grid-cols-4">
          {[
            { icon: Star, label: "Seller score", value: `${sc.score.toFixed(1)} / 5` },
            { icon: PackageCheck, label: "Orders completed", value: String(sc.delivered || (v.note === "demo" ? v.ratingCount * 3 : 0)) },
            { icon: Clock, label: "On-time", value: `${Math.round((1 - sc.lateRate) * 100)}%` },
            { icon: ShieldCheck, label: "Cancellations", value: `${Math.round(sc.cancelRate * 100)}%` },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-3 border-ink/[0.06] p-4 [&:not(:last-child)]:border-r">
              <x.icon className="h-5 w-5 text-savanna-600" />
              <div>
                <p className="font-display text-lg font-bold leading-tight">{x.value}</p>
                <p className="text-xs text-ink-muted">{x.label}</p>
              </div>
            </div>
          ))}
        </div>
        {v.description && <p className="whitespace-pre-line border-t border-ink/[0.06] px-5 py-4 text-sm text-ink-soft">{v.description}</p>}
      </header>
      <section className="mt-6">
        <StoreProducts products={st.products} />
      </section>
      {st.reviews.length > 0 && (
        <section className="mt-8 rounded-3xl bg-white p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-bold">What buyers say</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {st.reviews.map(({ r, name, product }) => (
              <li key={r.id} className="rounded-2xl bg-sand-50 p-4">
                <Stars value={r.rating} size="xs" />
                {r.text && <p className="mt-1 text-sm">{r.text}</p>}
                <p className="mt-2 text-xs text-ink-muted">
                  {(name || "Buyer").split(" ")[0]} · {product}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
