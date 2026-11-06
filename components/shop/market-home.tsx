"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Brush,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Compass,
  Footprints,
  Gem,
  Heart,
  Home,
  MapPin,
  Package,
  Palette,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Timer,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductCard as P, StoreCard } from "@/lib/repo/shop";
import { IMG } from "@/lib/data/images";
import { HUB_NAMES, SERVICE_TYPES, SHOP_CATEGORIES } from "@/lib/data/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { mediaUrl } from "./media";
import { EarnInvite, EarnPrompt, type JoinState } from "./earn-invite";
import { ProductCard } from "./product-card";
import { Stars, useWishlist } from "./ui";

const CAT_ICON: Record<string, typeof Gem> = {
  beadwork: Gem,
  garments: Shirt,
  carvings: Package,
  baskets: ShoppingBag,
  art: Palette,
  leather: Footprints,
  home: Home,
  food: Coffee,
  drivers: Car,
  guides: Compass,
  photographers: Camera,
  artists: Brush,
  experiences: Sparkles,
};

const SLIDES = [
  {
    kicker: "Made in Kenya · sold by the makers",
    title: "Beadwork, kiondo and carvings — straight from the people who make them",
    cta: { label: "Shop Kenyan-made", href: "#all", type: "product" as const },
    image: IMG.maasaiShuka,
    tone: "from-[#3a1d10]/90 via-[#3a1d10]/60",
  },
  {
    kicker: "Drivers · guides · photographers · artists",
    title: "Book trusted local pros before you land",
    cta: { label: "Book a local pro", href: "#pros", type: "service" as const },
    image: IMG.maraLion,
    tone: "from-ink/90 via-ink/60",
  },
  {
    kicker: "Tembea Express",
    title: "Delivered tomorrow in Nairobi. Pick up at 15 stations nationwide.",
    cta: { label: "See Express items", href: "#express", type: "product" as const },
    image: IMG.nairobiSkyline,
    tone: "from-[#1a1340]/90 via-[#1a1340]/55",
  },
];

const HUBS = ["mara", "diani", "tsavo", "nairobi"];
const HUB_IMG: Record<string, string> = { mara: IMG.maraMigration, diani: IMG.dianiPalms, tsavo: IMG.tsavoElephants, nairobi: IMG.nairobiSkyline };

function useCountdown() {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setLeft(`${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

function Rail({ title, kicker, action, children, id, icon: Icon }: { title: string; kicker?: string; action?: React.ReactNode; children: React.ReactNode; id?: string; icon?: typeof Gem }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          {kicker && <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-savanna-600">{kicker}</p>}
          <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {Icon && <Icon className="h-5 w-5" />} {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <button onClick={() => by(-1)} className="hidden h-9 w-9 place-items-center rounded-full bg-white shadow-card hover:bg-sand-50 sm:grid" aria-label="Scroll left">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => by(1)} className="hidden h-9 w-9 place-items-center rounded-full bg-white shadow-card hover:bg-sand-50 sm:grid" aria-label="Scroll right">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:gap-4 sm:px-0">
        {children}
      </div>
    </section>
  );
}

export function MarketHome({ stores, listings, initialQ = "", initialType = "", join }: { stores: StoreCard[]; listings: P[]; initialQ?: string; initialType?: string; join?: JoinState }) {
  const [slide, setSlide] = useState(0);
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState<"" | "product" | "service">(initialType === "service" || initialType === "product" ? initialType : "");
  const [cat, setCat] = useState("");
  const [hub, setHub] = useState("");
  const [sort, setSort] = useState("popular");
  const [expressOnly, setExpressOnly] = useState(false);
  const [proHub, setProHub] = useState("mara");
  const [toast, setToast] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { count } = useCart();
  const { ids: saved } = useWishlist();
  const left = useCountdown();
  const allRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);

  const products = listings.filter((l) => l.kind === "product");
  const services = listings.filter((l) => l.kind === "service");
  const deals = products.filter((p) => p.compareAt && p.compareAt > p.price);
  const express = products.filter((p) => p.express);
  const pros = services.filter((s) => s.hub === proHub);
  const makers = stores.filter((s) => s.sellerType !== "pro");
  const topPros = stores.filter((s) => s.sellerType !== "maker").slice(0, 10);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out = listings.filter(
      (p) =>
        (!type || p.kind === type) &&
        (!cat || p.category === cat || p.serviceType === cat) &&
        (!hub || p.hub === hub || p.madeIn.toLowerCase().includes((HUB_NAMES[hub] ?? hub).toLowerCase().split(" ")[0])) &&
        (!expressOnly || p.express) &&
        (!n || `${p.title} ${p.storeName} ${p.madeIn} ${p.category} ${p.serviceType ?? ""}`.toLowerCase().includes(n)),
    );
    const by: Record<string, (a: P, b: P) => number> = {
      popular: (a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold,
      rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
      new: (a, b) => b.createdAt - a.createdAt,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
    };
    return out.sort(by[sort]);
  }, [listings, q, type, cat, hub, sort, expressOnly]);

  const flash = (t: string) => {
    setToast(`Added "${t}" to your cart`);
    setTimeout(() => setToast(null), 2200);
  };
  const jumpToAll = () => setTimeout(() => allRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const s = SLIDES[slide];
  const filtering = !!(q || type || cat || hub || expressOnly);

  return (
    <div>
      {/* ------------------------------ Hero ------------------------------ */}
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div className="relative h-[300px] overflow-hidden rounded-[1.75rem] bg-ink sm:h-[360px] sm:rounded-[2rem]">
          <AnimatePresence mode="sync">
            <motion.div key={slide} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(s.image, 1400, 720)} alt="" className="h-full w-full object-cover" />
              <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent", s.tone)} />
            </motion.div>
          </AnimatePresence>
          <div className="relative flex h-full max-w-xl flex-col justify-end p-5 text-white sm:p-9">
            <AnimatePresence mode="wait">
              <motion.div key={slide} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}>
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-ochre-200 sm:text-xs">{s.kicker}</p>
                <h1 className="mt-2 text-[26px] font-bold leading-[1.12] text-white sm:text-[40px]">{s.title}</h1>
                <button
                  onClick={() => {
                    setType(s.cta.type);
                    if (s.cta.href === "#express") setExpressOnly(true);
                    if (s.cta.href === "#pros") document.getElementById("pros")?.scrollIntoView({ behavior: "smooth" });
                    else jumpToAll();
                  }}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-ink transition-transform hover:scale-[1.03]"
                >
                  {s.cta.label} <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </AnimatePresence>
            <div className="mt-5 flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} className="h-1.5 overflow-hidden rounded-full bg-white/30" style={{ width: i === slide ? 36 : 14 }}>
                  {i === slide && <motion.span key={slide} className="block h-full bg-white" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 6.5, ease: "linear" }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <button onClick={() => (setType("product"), setExpressOnly(true), jumpToAll())} className="group relative overflow-hidden rounded-[1.5rem] bg-ink p-4 text-left text-white">
            <Zap className="h-6 w-6 fill-ochre-400 text-ochre-400" />
            <p className="mt-6 font-display text-base font-bold leading-tight sm:text-lg">Tembea Express</p>
            <p className="text-xs text-white/70 sm:text-sm">Next-day in Nairobi</p>
            <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <Link href="/marketplace/join/seller" className="group relative overflow-hidden rounded-[1.5rem] bg-ochre-400 p-4 text-ink">
            <Store className="h-6 w-6" />
            <p className="mt-6 font-display text-base font-bold leading-tight sm:text-lg">Sell on Tembea</p>
            <p className="text-xs text-ink/70 sm:text-sm">Products or your services</p>
            <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* ------------------------------ Search + trust ------------------------------ */}
      <div className="sticky top-[60px] z-20 -mx-4 mt-4 bg-sand-50/90 px-4 py-2 backdrop-blur-xl lg:top-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            jumpToAll();
          }}
          className="flex gap-2"
        >
          <label className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search kiondo, kikoi, a Mara driver, a Diani photographer…" aria-label="Search the marketplace" className="h-12 w-full rounded-full border border-ink/10 bg-white pl-11 pr-10 text-sm shadow-card outline-none focus:border-savanna-500" />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-sand-100" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <Link href="/marketplace/saved" className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-card" aria-label="Saved">
            <Heart className="h-5 w-5" />
            {saved.size > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-maasai-500 px-1 text-[10px] font-bold text-white">{saved.size}</span>}
          </Link>
          <Link href="/checkout" className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white shadow-card" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span key={count} className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 animate-bump place-items-center rounded-full bg-ochre-400 px-1 text-[10px] font-bold text-ink">{count}</span>}
          </Link>
        </form>
      </div>
      <div className="scrollbar-none mt-3 flex gap-4 overflow-x-auto text-xs text-ink-soft sm:justify-between">
        {[
          { icon: BadgeCheck, t: "Every seller ID & KRA-verified" },
          { icon: ShieldCheck, t: "M-Pesa held until delivery" },
          { icon: Truck, t: "Home delivery or pick-up station" },
          { icon: RotateCcw, t: "7-day easy returns" },
        ].map((x) => (
          <span key={x.t} className="inline-flex shrink-0 items-center gap-1.5">
            <x.icon className="h-4 w-4 text-savanna-600" /> {x.t}
          </span>
        ))}
      </div>

      {join && <EarnPrompt state={join} />}

      {/* ------------------------------ Categories ------------------------------ */}
      <section className="mt-6">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
          {[...SHOP_CATEGORIES.map((c) => ({ id: c.id, name: c.name.split(/ & |, /)[0], type: "product" as const })), ...SERVICE_TYPES.map((c) => ({ id: c.id, name: c.short, type: "service" as const }))].map((c, i) => {
            const Icon = CAT_ICON[c.id] ?? Sparkles;
            const on = cat === c.id;
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  setCat(on ? "" : c.id);
                  setType(on ? "" : c.type);
                  jumpToAll();
                }}
                className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-auto"
              >
                <span className={cn("grid h-14 w-14 place-items-center rounded-2xl transition-all group-hover:-translate-y-0.5", on ? "bg-ink text-white" : c.type === "service" ? "bg-dusk-50 text-dusk-700" : "bg-white text-ink shadow-card")}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink-soft">{c.name}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {!filtering && (
        <>
          {/* ------------------------------ Local pros ------------------------------ */}
          <section id="pros" className="mt-10 scroll-mt-28">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-savanna-600">Hire before you land</p>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">Local pros, verified by Tembea</h2>
              <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {HUBS.map((h) => (
                  <button key={h} onClick={() => setProHub(h)} className={cn("h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors", proHub === h ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card")}>
                    {HUB_NAMES[h]}
                  </button>
                ))}
              </div>
            </div>
            <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:gap-4 sm:px-0">
              {pros.map((p, i) => (
                <motion.div key={proHub + p.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="shrink-0">
                  <ProductCard p={p} wide />
                </motion.div>
              ))}
              {!pros.length && <p className="text-sm text-ink-muted">No pros listed here yet.</p>}
            </div>
          </section>

          {/* ------------------------------ Deals ------------------------------ */}
          {deals.length > 0 && (
            <section className="mt-10 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-maasai-600 to-maasai-700 p-4 text-white sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
                  <Timer className="h-6 w-6" /> Deals of the day
                </h2>
                {left && (
                  <span className="rounded-full bg-white/15 px-3 py-1.5 font-display text-sm font-semibold tabular-nums" aria-live="off">
                    Ends in {left}
                  </span>
                )}
              </div>
              <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 text-ink sm:mx-0 sm:px-0">
                {deals.map((p) => (
                  <ProductCard key={p.id} p={p} wide onAdded={flash} />
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------ Express ------------------------------ */}
          {express.length > 0 && (
            <Rail id="express" kicker="Stocked at Tembea hubs" title="Tembea Express" icon={Zap}>
              {express.map((p) => (
                <ProductCard key={p.id} p={p} wide onAdded={flash} />
              ))}
            </Rail>
          )}

          {/* ------------------------------ Makers ------------------------------ */}
          {makers.length > 0 && (
            <Rail kicker="Official stores" title="Shop by maker">
              {makers.map((st) => (
                <StoreTile key={st.id} st={st} />
              ))}
            </Rail>
          )}

          {/* ------------------------------ Destinations ------------------------------ */}
          <section className="mt-10">
            <h2 className="mb-3 text-xl font-bold sm:text-2xl">Shop & book by destination</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {HUBS.map((h, i) => (
                <motion.button
                  key={h}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => (setHub(h), jumpToAll())}
                  className="group relative h-40 overflow-hidden rounded-3xl text-left sm:h-52"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(HUB_IMG[h], 600, 420)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/80">
                      <MapPin className="h-3 w-3" /> {listings.filter((l) => l.hub === h).length} pros & makers
                    </span>
                    <span className="font-display text-lg font-bold">{HUB_NAMES[h]}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </section>

          {/* ------------------------------ Top pros ------------------------------ */}
          {topPros.length > 0 && (
            <Rail kicker="Highest rated" title="Top-rated drivers, guides & creatives">
              {topPros.map((st) => (
                <StoreTile key={st.id} st={st} compact />
              ))}
            </Rail>
          )}
        </>
      )}

      {/* ------------------------------ Everything ------------------------------ */}
      <section ref={allRef} id="all" className="mt-10 scroll-mt-28">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">{filtering ? `${list.length} result${list.length === 1 ? "" : "s"}` : "Everything on Tembea"}</h2>
            {filtering && (
              <button onClick={() => (setQ(""), setType(""), setCat(""), setHub(""), setExpressOnly(false))} className="text-sm font-semibold text-savanna-700">
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white p-1 shadow-card">
              {[
                ["", "All"],
                ["product", "Products"],
                ["service", "Services"],
              ].map(([v, l]) => (
                <button key={v} onClick={() => setType(v as typeof type)} className={cn("h-8 rounded-full px-3 text-xs font-semibold", type === v ? "bg-ink text-white" : "text-ink-soft")}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-card", filtersOpen ? "bg-ink text-white" : "bg-white")}>
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>
        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mb-4 grid gap-3 rounded-3xl bg-white p-4 shadow-card sm:grid-cols-4">
                <label className="text-xs font-semibold text-ink-muted">
                  Sort by
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink">
                    <option value="popular">Most popular</option>
                    <option value="rating">Top rated</option>
                    <option value="new">Newest</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-muted">
                  Destination
                  <select value={hub} onChange={(e) => setHub(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink">
                    <option value="">Anywhere</option>
                    {HUBS.map((h) => (
                      <option key={h} value={h}>
                        {HUB_NAMES[h]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-muted">
                  Category
                  <select value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink">
                    <option value="">All categories</option>
                    <optgroup label="Products">
                      {SHOP_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Services">
                      {SERVICE_TYPES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                  <input type="checkbox" checked={expressOnly} onChange={(e) => setExpressOnly(e.target.checked)} className="h-4 w-4 accent-savanna-600" /> Tembea Express only
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {list.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}>
              <ProductCard p={p} onAdded={flash} />
            </motion.div>
          ))}
        </div>
        {!list.length && (
          <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-2 font-display font-semibold">Nothing matches yet</p>
            <p className="text-sm text-ink-muted">Try another word, or clear the filters. New sellers join every week.</p>
          </div>
        )}
      </section>

      {/* ------------------------------ Earn with Tembea254: sell or create ------------------------------ */}
      {join && (
        <div className="mt-12">
          <EarnInvite state={join} />
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.p role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm text-white shadow-lift">
            {toast} ·{" "}
            <Link href="/checkout" className="font-semibold text-ochre-400">
              Checkout
            </Link>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StoreTile({ st, compact }: { st: StoreCard; compact?: boolean }) {
  return (
    <Link href={`/marketplace/store/${st.slug}`} className={cn("group w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lift sm:w-[280px]", compact && "w-[220px] sm:w-[240px]")}>
      <div className={cn("relative bg-sand-100", compact ? "h-24" : "h-32")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(st.banner || st.cover) && <img src={mediaUrl(st.banner || st.cover, 600, 260)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
        {st.demo && <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">Demo</span>}
      </div>
      <div className="flex items-start gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {st.logo ? <img src={mediaUrl(st.logo, 120, 120)} alt="" className="-mt-10 h-14 w-14 shrink-0 rounded-2xl border-4 border-white object-cover" /> : <span className="-mt-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-4 border-white bg-ochre-400 font-display text-lg font-bold text-ink">{st.storeName[0]}</span>}
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-display font-bold">
            <span className="truncate">{st.storeName.replace(" (demo)", "")}</span> <BadgeCheck className="h-4 w-4 shrink-0 text-savanna-600" />
          </p>
          <p className="line-clamp-1 text-xs text-ink-muted">{st.tagline}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
            <Stars value={st.rating} count={st.ratingCount} size="xs" />
            <span className="truncate">· {st.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
