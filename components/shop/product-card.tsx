"use client";

import Link from "next/link";
import { BadgeCheck, CalendarCheck, Check, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import type { ProductCard as P } from "@/lib/repo/shop";
import { HUB_NAMES, SERVICE_TYPE_BY_ID, SERVICE_UNITS, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { cn, money } from "@/lib/utils";
import { useCart } from "./cart";
import { mediaUrl } from "./media";
import { ExpressBadge, Stars, WishButton } from "./ui";

/** One card for both products (add to cart) and services (book a date). */
export function ProductCard({ p, onAdded, wide }: { p: P; onAdded?: (title: string) => void; wide?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const off = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  const service = p.kind === "service";
  const href = `/marketplace/product/${p.id}`;
  const label = service ? SERVICE_TYPE_BY_ID[p.serviceType ?? p.category]?.short : SHOP_CATEGORY_BY_ID[p.category]?.name;

  return (
    <article className={cn("group relative flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-lift", wide && "w-[220px] shrink-0 snap-start sm:w-[240px]")}>
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-sand-100" aria-label={p.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image && <img src={mediaUrl(p.image, 520, 650)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-105" />}
        {p.images[1] && (
          // second photo fades in on hover, like big retail sites
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(p.images[1], 520, 650)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {off > 0 && <span className="rounded-md bg-maasai-500 px-1.5 py-0.5 font-display text-[11px] font-bold text-white">-{off}%</span>}
          {p.express && !service && <ExpressBadge />}
          {service && <span className="rounded-md bg-white/90 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink">{label}</span>}
        </div>
        <WishButton id={p.id} className="absolute right-2 top-2" />
        {p.demo && <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">Demo</span>}
        {service && p.hub && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            <MapPin className="h-3 w-3" /> {HUB_NAMES[p.hub] ?? p.hub}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] font-display text-[14px] font-semibold leading-snug text-ink hover:text-savanna-700">
          {p.title}
        </Link>
        <Link href={`/marketplace/store/${p.storeSlug}`} className="mt-1 inline-flex min-w-0 items-center gap-1 text-xs text-ink-muted hover:text-savanna-700">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-savanna-600" /> <span className="truncate">{p.storeName.replace(" (demo)", "")}</span>
        </Link>
        <Stars value={p.rating} count={p.ratingCount} size="xs" className="mt-1.5" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <div className="min-w-0 leading-tight">
            {service && <span className="block text-[10px] uppercase tracking-wide text-ink-muted">from</span>}
            <span className="font-display text-[16px] font-bold text-ink sm:text-[17px]">{money(p.price)}</span>
            {service ? <span className="block text-[11px] text-ink-muted">{SERVICE_UNITS[p.unit] ?? ""}</span> : off > 0 && <span className="ml-1 text-[11px] text-ink-muted line-through">{money(p.compareAt!)}</span>}
            {!service && p.sold > 0 && <span className="block text-[10px] text-ink-muted">{p.sold}+ sold</span>}
          </div>
          {service ? (
            <Link href={href} className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink font-display text-xs font-semibold text-white transition-colors hover:bg-savanna-600 sm:w-auto sm:px-3.5" aria-label={`Book ${p.title}`}>
              <CalendarCheck className="h-4 w-4" /> <span className="hidden sm:inline">Book</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled={p.stock < 1}
              onClick={() => {
                add(p.id);
                setAdded(true);
                onAdded?.(p.title);
                setTimeout(() => setAdded(false), 1400);
              }}
              className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-all active:scale-90 disabled:bg-sand-200 disabled:text-ink-muted", added ? "bg-ink" : "bg-savanna-500 hover:bg-savanna-600")}
              aria-label={p.stock < 1 ? `${p.title} is sold out` : `Add ${p.title} to cart`}
            >
              {added ? <Check className="h-5 w-5 animate-bump" /> : <Plus className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="aspect-[4/5] animate-shimmer bg-[linear-gradient(90deg,#F6F1E7_0%,#FBF8F2_50%,#F6F1E7_100%)] bg-[length:800px_100%]" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded bg-sand-100" />
        <div className="h-3 w-1/2 rounded bg-sand-100" />
        <div className="h-5 w-1/3 rounded bg-sand-100" />
      </div>
    </div>
  );
}
