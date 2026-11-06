"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, CalendarDays, Check, ChevronRight, Clock, Languages, MapPin, Minus, Package, Plus, RotateCcw, ShieldCheck, ShoppingCart, Store, Truck, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductCard as P } from "@/lib/repo/shop";
import { HUB_NAMES, KENYA_COUNTIES, PICKUP_STATIONS, SERVICE_TYPE_BY_ID, SERVICE_UNITS, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { deliveryWindow, fmtDay, zoneFor } from "@/lib/delivery";
import { cn, money } from "@/lib/utils";
import { useCart } from "./cart";
import { mediaUrl } from "./media";
import { ProductCard } from "./product-card";
import { ExpressBadge, Stars, WishButton } from "./ui";

type Listing = {
  id: string;
  kind: string;
  title: string;
  description: string;
  price: number;
  compareAt: number | null;
  stock: number;
  images: string[];
  category: string;
  serviceType: string | null;
  hub: string | null;
  unit: string;
  languages: string[];
  capacity: number | null;
  madeIn: string;
  tags: string[];
  express: boolean;
  rating: number;
  ratingCount: number;
  sold: number;
};
type Seller = { slug: string; storeName: string; logo: string | null; location: string; demo: boolean; sellerType: string; since: number };
type Score = { score: number; rating: number; ratingCount: number; orders: number; cancelRate: number; lateRate: number };
type Review = { id: string; rating: number; text: string; images: string[]; name: string; image: string | null; createdAt: number };

export function ProductView({
  product: p,
  store,
  score,
  reviews,
  more,
  similar,
  posts,
  fees,
  returnDays,
}: {
  product: Listing;
  store: Seller;
  score: Score;
  reviews: Review[];
  more: P[];
  similar: P[];
  posts: { id: string; media: { type: string; url: string; poster?: string }[]; text: string }[];
  fees: { home: number; nairobi: number; pickup: number; freeOver: number };
  returnDays: number;
}) {
  const service = p.kind === "service";
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [county, setCounty] = useState("Nairobi");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const { add } = useCart();
  const router = useRouter();
  const off = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  // dates depend on "now", so they're only worked out in the browser (avoids hydration mismatches)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const win = useMemo(() => (mounted ? deliveryWindow(county, p.express) : null), [mounted, county, p.express]);
  const homeFee = zoneFor(county) === "metro" ? fees.nairobi : fees.home;
  const minDate = mounted ? new Date(Date.now() + 86400_000).toISOString().slice(0, 10) : undefined;
  const unitLabel = SERVICE_UNITS[p.unit] ?? "";
  const typeName = service ? SERVICE_TYPE_BY_ID[p.serviceType ?? p.category]?.name : SHOP_CATEGORY_BY_ID[p.category]?.name;

  const go = (checkout: boolean) => {
    setErr("");
    if (service && !date) return setErr("Pick a date first.");
    add(p.id, qty, service ? { date, note } : undefined);
    if (checkout) router.push("/checkout");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-ink-muted" aria-label="Breadcrumb">
        <Link href="/marketplace" className="hover:text-ink">
          Marketplace
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/marketplace?type=${service ? "service" : "product"}`} className="hover:text-ink">
          {service ? "Services" : "Products"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-soft">{typeName}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        {/* ------------------------------ Gallery ------------------------------ */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-sand-100">
            <AnimatePresence mode="wait">
              {p.images[img] && (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img key={img} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} src={mediaUrl(p.images[img], 1100, 1100)} alt={p.title} className="h-full w-full object-cover" />
              )}
            </AnimatePresence>
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {off > 0 && <span className="rounded-lg bg-maasai-500 px-2 py-1 font-display text-xs font-bold text-white">-{off}%</span>}
              {p.express && <ExpressBadge className="text-[11px]" />}
            </div>
            <WishButton id={p.id} className="absolute right-3 top-3 h-11 w-11" />
            {store.demo && <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">Demo listing</span>}
          </div>
          {p.images.length > 1 && (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              {p.images.map((u, i) => (
                <button key={u + i} onClick={() => setImg(i)} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition-all sm:h-20 sm:w-20", img === i ? "ring-savanna-500" : "opacity-70 ring-transparent hover:opacity-100")} aria-label={`Photo ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(u, 200, 200)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------ Buy box ------------------------------ */}
        <div>
          <Link href={`/marketplace/store/${store.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-savanna-700 hover:underline">
            <Store className="h-4 w-4" /> {store.storeName.replace(" (demo)", "")} <BadgeCheck className="h-4 w-4" />
          </Link>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-[32px]">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Stars value={p.rating} count={p.ratingCount} />
            {p.sold > 0 && <span className="text-ink-muted">· {p.sold}+ {service ? "bookings" : "sold"}</span>}
            {service && p.hub && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                · <MapPin className="h-3.5 w-3.5" /> {HUB_NAMES[p.hub] ?? p.hub}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-card sm:p-5">
            <p className="flex flex-wrap items-baseline gap-2">
              {service && <span className="text-sm text-ink-muted">From</span>}
              <span className="font-display text-[34px] font-bold leading-none">{money(p.price)}</span>
              {service && <span className="text-ink-muted">{unitLabel}</span>}
              {off > 0 && (
                <>
                  <span className="text-ink-muted line-through">{money(p.compareAt!)}</span>
                  <span className="rounded-full bg-maasai-50 px-2 py-0.5 text-xs font-bold text-maasai-600">Save {money(p.compareAt! - p.price)}</span>
                </>
              )}
            </p>
            {!service && <p className={cn("mt-1 text-sm font-medium", p.stock > 5 ? "text-savanna-700" : p.stock > 0 ? "text-ochre-600" : "text-maasai-600")}>{p.stock > 5 ? "In stock" : p.stock > 0 ? `Only ${p.stock} left` : "Sold out"}</p>}

            {service ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Date
                  <span className="relative mt-1 block">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-2xl border border-ink/10 bg-white pl-9 pr-3 text-sm outline-none focus:border-savanna-500" />
                  </span>
                </label>
                <div className="text-sm font-medium">
                  {p.unit === "person" ? "People" : `How many (${unitLabel.replace("per ", "")}s)`}
                  <Qty qty={qty} setQty={setQty} max={p.capacity ?? 14} />
                </div>
                <label className="text-sm font-medium sm:col-span-2">
                  Pick-up point & notes
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Pick us at Mara Serena at 6am, 4 adults" className="mt-1 h-12 w-full rounded-2xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-savanna-500" />
                </label>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-medium">Qty</span>
                <Qty qty={qty} setQty={setQty} max={Math.min(20, p.stock)} />
              </div>
            )}

            {err && <p className="mt-3 text-sm font-medium text-maasai-600">{err}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button disabled={!service && p.stock < 1} onClick={() => go(false)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 font-display font-semibold transition-colors disabled:opacity-50", added ? "border-ink bg-ink text-white" : "border-ink text-ink hover:bg-ink hover:text-white")}>
                {added ? <Check className="h-5 w-5 animate-bump" /> : <ShoppingCart className="h-5 w-5" />} {added ? "In your cart" : "Add to cart"}
              </button>
              <button disabled={!service && p.stock < 1} onClick={() => go(true)} className="inline-flex h-12 items-center justify-center rounded-full bg-savanna-500 font-display font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50">
                {service ? `Book · ${money(p.price * qty)}` : "Buy now"}
              </button>
            </div>
          </div>

          {/* Delivery promise / service promise */}
          <div className="mt-3 divide-y divide-ink/[0.06] rounded-3xl bg-white shadow-card">
            {service ? (
              <>
                <Row icon={ShieldCheck} title="Pay now, the pro is paid after the job">Your M-Pesa payment is held by Tembea and released to {store.storeName.replace(" (demo)", "")} once the service is done.</Row>
                <Row icon={Clock} title="Confirmed within 24 hours">The pro confirms your date. If they can't make it, you get a full refund.</Row>
                {p.languages.length > 0 && (
                  <Row icon={Languages} title="Speaks">
                    {p.languages.join(", ")}
                  </Row>
                )}
                {p.capacity && (
                  <Row icon={Users} title="Group size">
                    Up to {p.capacity} people
                  </Row>
                )}
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-savanna-600" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display font-semibold">Delivery</p>
                      <select value={county} onChange={(e) => setCounty(e.target.value)} className="h-8 rounded-full border border-ink/10 bg-sand-50 px-2 text-xs" aria-label="Deliver to county">
                        {KENYA_COUNTIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {mounted && win && (
                      <p className="mt-1">
                        Arrives <span className="font-semibold text-savanna-700">{fmtDay(win.from)}</span>
                        {+win.to !== +win.from && (
                          <>
                            {" "}
                            – <span className="font-semibold text-savanna-700">{fmtDay(win.to)}</span>
                          </>
                        )}
                        {p.express && <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-ink">· <Zap className="h-3 w-3 fill-ochre-400 text-ochre-400" /> Express</span>}
                      </p>
                    )}
                    <p className="text-ink-muted">
                      Home delivery {money(homeFee)} · Pick-up station {money(fees.pickup)} · free over {money(fees.freeOver)}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{PICKUP_STATIONS.filter((s) => s.county === county).length || "15"} pick-up stations {PICKUP_STATIONS.some((s) => s.county === county) ? `in ${county}` : "nationwide"}</p>
                  </div>
                </div>
                <Row icon={RotateCcw} title={`${returnDays}-day returns`}>
                  Changed your mind or it arrived damaged? Ask for a return from your order page.
                </Row>
                <Row icon={ShieldCheck} title="Buyer protection">
                  Pay with M-Pesa. Tembea holds the money until you have your parcel.
                </Row>
              </>
            )}
          </div>

          {/* Seller card */}
          <Link href={`/marketplace/store/${store.slug}`} className="mt-3 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card transition-shadow hover:shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {store.logo ? <img src={mediaUrl(store.logo, 100, 100)} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ochre-400 font-display text-lg font-bold">{store.storeName[0]}</span>}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-display font-semibold">
                {store.storeName.replace(" (demo)", "")} <BadgeCheck className="h-4 w-4 text-savanna-600" />
              </span>
              <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                <span>
                  Seller score <span className="font-semibold text-ink">{score.score.toFixed(1)}/5</span>
                </span>
                <span>· {store.location}</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-ink-muted" />
          </Link>
        </div>
      </div>

      {/* ------------------------------ Details ------------------------------ */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-3 font-display text-lg font-bold">{service ? "About this service" : "Product details"}</h2>
          <div className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{p.description}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/[0.06] pt-4 text-sm">
            <div>
              <dt className="text-xs text-ink-muted">{service ? "Type" : "Category"}</dt>
              <dd className="font-medium">{typeName}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{service ? "Based in" : "Made in"}</dt>
              <dd className="font-medium">{p.madeIn || store.location}</dd>
            </div>
          </dl>
          {p.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <Link key={t} href={`/marketplace?q=${encodeURIComponent(t)}`} className="rounded-full bg-sand-100 px-3 py-1 text-xs hover:bg-sand-200">
                  {t}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-display text-lg font-bold">Reviews</h2>
          <div className="mt-2 flex items-center gap-4">
            <p className="font-display text-5xl font-bold">{p.ratingCount ? p.rating.toFixed(1) : "—"}</p>
            <div>
              <Stars value={p.rating} size="md" />
              <p className="text-sm text-ink-muted">{p.ratingCount ? `${p.ratingCount} verified ${service ? "bookings" : "purchases"}` : "No reviews yet"}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-ink/[0.06] pt-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-savanna-100 font-display text-sm font-bold text-savanna-700">{r.name[0]}</span>
                  <span className="text-sm font-semibold">{r.name.split(" ")[0]}</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-savanna-50 px-2 py-0.5 text-[10px] font-semibold text-savanna-700">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                </div>
                <Stars value={r.rating} size="xs" className="mt-1.5" />
                {r.text && <p className="mt-1 text-sm text-ink-soft">{r.text}</p>}
              </li>
            ))}
          </ul>
          {!reviews.length && <p className="mt-3 text-sm text-ink-muted">Buyers can review after their order is delivered{service ? " or the service is done" : ""}. Every review is from a real purchase.</p>}
        </section>
      </div>

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold">Seen in the community</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto">
            {posts.map((x) => (
              <Link key={x.id} href={`/community/p/${x.id}`} className="relative h-56 w-40 shrink-0 overflow-hidden rounded-3xl bg-ink">
                {x.media[0]?.type === "video" ? <video src={x.media[0].url} muted playsInline className="h-full w-full object-cover" /> : x.media[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(x.media[0].url, 320, 440)} alt="" className="h-full w-full object-cover" />}
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 p-2 text-xs text-white">{x.text}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold">More from {store.storeName.replace(" (demo)", "")}</h2>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {more.map((x) => (
              <ProductCard key={x.id} p={x} wide />
            ))}
          </div>
        </section>
      )}
      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold">{service ? "Other pros you might like" : "You may also like"}</h2>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {similar.map((x) => (
              <ProductCard key={x.id} p={x} wide />
            ))}
          </div>
        </section>
      )}

      {/* sticky buy bar on phones */}
      <div className="fixed inset-x-3 bottom-24 z-30 flex items-center gap-3 rounded-full bg-ink p-1.5 pl-5 text-white shadow-lift lg:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-white/70">{p.title}</span>
          <span className="font-display font-bold">{money(p.price * (service ? qty : 1))}</span>
        </span>
        <button onClick={() => (service && !date ? window.scrollTo({ top: 0, behavior: "smooth" }) : go(true))} disabled={!service && p.stock < 1} className="h-11 shrink-0 rounded-full bg-savanna-500 px-5 font-display text-sm font-semibold disabled:opacity-50">
          {service ? (date ? "Book now" : "Pick a date") : "Buy now"}
        </button>
      </div>
      <div className="h-16 lg:hidden" />
    </>
  );
}

function Qty({ qty, setQty, max }: { qty: number; setQty: (n: number) => void; max: number }) {
  return (
    <div className="mt-1 flex h-12 w-fit items-center rounded-full border border-ink/15 bg-white">
      <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-12 w-11 place-items-center" aria-label="Fewer">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-display font-semibold tabular-nums">{qty}</span>
      <button type="button" onClick={() => setQty(Math.min(Math.max(1, max), qty + 1))} className="grid h-12 w-11 place-items-center" aria-label="More">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Row({ icon: Icon, title, children }: { icon: typeof Package; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 text-sm">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-savanna-600" />
      <div>
        <p className="font-display font-semibold">{title}</p>
        <p className="text-ink-muted">{children}</p>
      </div>
    </div>
  );
}
