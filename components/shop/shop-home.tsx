"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Check, MapPin, Search, ShoppingCart, Store } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProductCard as P, StoreCard } from "@/lib/repo/shop";
import { SHOP_CATEGORIES } from "@/lib/data/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { mediaUrl } from "./media";
import { ProductCard } from "./product-card";

/** "Shop Kenyan-made": maker stores as tag cards, then the full product catalogue. */
export function ShopHome({ stores, products }: { stores: StoreCard[]; products: P[] }) {
  const [cat, setCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { count } = useCart();
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category === cat) && (!n || `${p.title} ${p.storeName} ${p.madeIn}`.toLowerCase().includes(n)));
  }, [products, cat, q]);
  const flash = (t: string) => {
    setToast(`Added "${t}" to your cart`);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#3a1d10] p-5 text-white sm:rounded-[2rem] sm:p-10">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_85%_20%,#F2B13A,transparent_45%),radial-gradient(circle_at_10%_90%,#C8102E,transparent_40%)]" />
        <div className="relative max-w-xl">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-ochre-200 sm:text-xs">Made in Kenya · sold by the makers</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-4xl">Beadwork, kikoi, carvings and more — straight from Kenyan makers</h1>
          <p className="mt-2 text-sm text-white/80 sm:text-base">Every store is verified by Tembea. Pay with M-Pesa; the maker gets paid when your order is delivered.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/checkout" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-ink">
              <ShoppingCart className="h-4 w-4" /> Cart{count ? ` (${count})` : ""}
            </Link>
            <Link href="/marketplace/join/seller" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 font-display text-sm font-semibold ring-1 ring-white/25">
              <Store className="h-4 w-4" /> Sell on Tembea
            </Link>
          </div>
        </div>
      </div>

      {stores.length > 0 && (
        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">Shop by maker</h2>
            <Link href="/orders" className="text-sm font-semibold text-savanna-600">
              My orders
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {stores.map((st) => (
              <Link key={st.id} href={`/marketplace/store/${st.slug}`} className="group w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-lift sm:w-[280px]">
                <div className="relative h-28 bg-sand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {(st.banner || st.cover) && <img src={mediaUrl(st.banner || st.cover, 600, 240)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  {st.demo && <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 font-display text-[11px] font-semibold text-white">Demo</span>}
                </div>
                <div className="flex items-start gap-3 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {st.logo ? <img src={mediaUrl(st.logo, 120, 120)} alt="" className="-mt-10 h-14 w-14 shrink-0 rounded-2xl border-4 border-white object-cover" /> : <span className="-mt-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-4 border-white bg-ochre-400 font-display text-lg font-bold text-ink">{st.storeName[0]}</span>}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate font-display font-bold">
                      {st.storeName.replace(" (demo)", "")} <BadgeCheck className="h-4 w-4 shrink-0 text-savanna-600" />
                    </p>
                    <p className="line-clamp-1 text-xs text-ink-muted">{st.tagline}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                      <MapPin className="h-3 w-3" /> {st.location} · {st.products} items <ArrowRight className="ml-auto h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search beadwork, kikoi, soapstone…" aria-label="Search products" className="h-12 w-full rounded-2xl border border-ink/10 bg-white pl-10 pr-4 text-sm outline-none focus:border-savanna-500" />
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ id: "", name: "Everything" }, ...SHOP_CATEGORIES].map((c) => (
            <button key={c.id || "all"} onClick={() => setCat(c.id)} className={cn("h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm", cat === c.id ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink-soft")}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} onAdded={flash} />
          ))}
        </div>
        {!list.length && <p className="mt-4 rounded-3xl border border-dashed border-ink/15 p-8 text-center text-ink-muted">No products match yet. New makers are joining every week.</p>}
      </section>

      <AnimatePresence>
        {count > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 lg:bottom-8">
            <Link href="/checkout" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-display text-sm font-semibold text-white shadow-lift">
              <ShoppingCart className="h-4 w-4" /> Checkout · {count} item{count === 1 ? "" : "s"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.p role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-savanna-600 px-4 py-2 text-sm text-white shadow-lift">
            <Check className="mr-1 inline h-4 w-4" /> {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
