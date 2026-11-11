"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Columns3, Globe, Plus, Search, SlidersHorizontal, Sparkles, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultQuantity, groupPrice, normalizeItem, KIND_LABEL, SOURCE_LABEL, UNIT_TEXT, type CatalogItem, type CatalogKind, type CatalogSource } from "@/lib/catalog-types";
import { PLACE_BY_ID } from "@/lib/data/places";
import { rebuildFromStops, computePlanned } from "@/lib/planner/engine";
import { applyPick, firstDateAt, materializePicks, pickFrom, removePick } from "@/lib/planner/picks";
import type { Trip } from "@/lib/planner/types";
import { cn, money, unsplash, type Currency } from "@/lib/utils";
import { BookingSheet } from "./booking-sheet";
import { fetchLive, fromLive, fromParam } from "./live-offers";

/**
 * Compare & book: search everything bookable at the trip's stops (packages, stays, vehicles, guides,
 * day trips) from every source, put up to three side by side, then use one in the plan or book it.
 */
const KINDS: (CatalogKind | "all")[] = ["all", "package", "stay", "transport", "guide", "tour"];
type Sort = "match" | "price" | "rating";

const cache = new Map<string, Promise<{ items: CatalogItem[]; affiliates: Record<string, boolean> }>>();
function loadCatalog(places: string[]) {
  const key = [...places].sort().join(",");
  if (!cache.has(key))
    cache.set(
      key,
      fetch(`/api/catalog?places=${key}`)
        .then((r) => (r.ok ? r.json() : { items: [], affiliates: {} }))
        .then((d: { items?: CatalogItem[]; affiliates?: Record<string, boolean> }) => ({ items: (d.items ?? []).map(normalizeItem), affiliates: d.affiliates ?? {} }))
        .catch(() => ({ items: [], affiliates: {} })),
    );
  return cache.get(key)!;
}

const img = (u?: string) => (!u ? "" : /^(https?:|\/)/.test(u) ? u : unsplash(u, 480, 300));

export function CompareWorkspace({ trip, onChange, currency }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency }) {
  const places = useMemo(() => [...new Set(trip.stops.map((s) => s.placeId))], [trip.stops]);
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [affiliates, setAffiliates] = useState<Record<string, boolean>>({});
  const [kind, setKind] = useState<CatalogKind | "all">("all");
  const [stop, setStop] = useState<string>("all");
  const [sources, setSources] = useState<CatalogSource[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("match");
  const [maxPrice, setMaxPrice] = useState(0);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [booking, setBooking] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Packages operators publish on their own sites (Bonfire Adventures, SafariBookings, TripAdvisor…),
  // found by the AI search and listed here next to everything else so they can be compared.
  const [online, setOnline] = useState<CatalogItem[] | null>(null);
  const [onlineNote, setOnlineNote] = useState<string | undefined>();
  const liveQs = new URLSearchParams({ type: "packages", places: places.join(","), days: String(trip.days.length), travelers: String(trip.travelers), budget: trip.budget, from: fromParam(trip) }).toString();
  useEffect(() => {
    let on = true;
    loadCatalog(places).then((d) => {
      if (!on) return;
      setItems(d.items);
      setAffiliates(d.affiliates);
    });
    return () => {
      on = false;
    };
  }, [places]);
  useEffect(() => {
    let on = true;
    setOnline(null);
    fetchLive(liveQs).then((d) => {
      if (!on) return;
      setOnline((d.offers ?? []).filter((o) => o.kind === "package").map((o, i) => normalizeItem(fromLive(o, i, places))));
      setOnlineNote(d.status === "live" ? undefined : d.note);
    });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveQs]);
  const all = useMemo(() => (items ? [...items, ...(online ?? [])] : null), [items, online]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const byId = useMemo(() => Object.fromEntries((all ?? []).map((i) => [i.id, i])), [all]);
  const nightsAt = (placeId: string) => trip.stops.find((s) => s.placeId === placeId)?.nights ?? 1;
  const totalFor = (i: CatalogItem) => groupPrice(i, trip.travelers, defaultQuantity(i, nightsAt(i.places[0])));
  const coverage = (i: CatalogItem) => i.places.filter((p) => places.includes(p)).length;

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = (all ?? []).filter(
      (i) =>
        (kind === "all" || i.kind === kind) &&
        (stop === "all" || i.places.includes(stop)) &&
        (!sources.length || sources.includes(i.source)) &&
        (!maxPrice || (totalFor(i) ?? 0) <= maxPrice) &&
        words.every((w) => `${i.title} ${i.provider} ${i.includes.join(" ")}`.toLowerCase().includes(w)),
    );
    const score = (i: CatalogItem) => coverage(i) * 2 + (i.rating ?? 4) / 5 + (i.tier === trip.budget ? 1 : 0) + (i.price ? 0.5 : 0);
    return out.sort((a, b) => {
      // sponsored listings are shown first and labelled; they don't change scores or badges
      if (sort === "match" && !!a.sponsored !== !!b.sponsored) return a.sponsored ? -1 : 1;
      if (sort === "price") return (totalFor(a) ?? 9e12) - (totalFor(b) ?? 9e12);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return score(b) - score(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, kind, stop, sources, q, sort, maxPrice, trip.travelers, trip.budget]);

  const presentSources = [...new Set((all ?? []).map((i) => i.source))];
  const chosen = compare.map((id) => byId[id]).filter(Boolean);

  function toggleCompare(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? [...c.slice(1), id] : [...c, id]));
  }

  /** put a choice into the plan */
  function use(item: CatalogItem) {
    const placeId = stop !== "all" && item.places.includes(stop) ? stop : item.places.find((p) => places.includes(p)) ?? item.places[0] ?? places[0];
    const pick = pickFrom(item, trip, placeId, { date: item.kind === "package" ? undefined : firstDateAt(trip, placeId) });
    const { stops, picks } = applyPick(trip, pick, item.kind === "stay" ? item.price : undefined);
    let next: Trip;
    if (item.kind === "package") next = rebuildFromStops({ ...trip, stops, picks });
    else if (item.kind === "stay") {
      const t = { ...trip, stops, picks, updatedAt: Date.now() };
      next = { ...t, planned: computePlanned(t) };
    } else {
      // add just this item to the current days, keeping any edits the traveller made
      const added = materializePicks({ ...trip, picks: [pick] });
      const t = { ...trip, days: added.days, picks, updatedAt: Date.now() };
      next = { ...t, planned: computePlanned(t) };
    }
    onChange(next);
    setShowCompare(false);
    setToast(item.kind === "package" ? `"${item.title}" now runs those days. The rest of the trip was re-planned around it.` : `Added to your plan at ${PLACE_BY_ID[placeId]?.name}.`);
  }

  function unuse(id: string) {
    const pick = trip.picks?.find((p) => p.id === id);
    const { stops, picks } = removePick(trip, id);
    if (pick?.kind === "package") onChange(rebuildFromStops({ ...trip, stops, picks }));
    else {
      const days = trip.days.map((d) => ({ ...d, items: d.items.filter((it) => !(pick && it.title.includes(pick.title) && it.title.includes(pick.provider))) }));
      const t = { ...trip, stops, picks, days, updatedAt: Date.now() };
      onChange({ ...t, planned: computePlanned(t) });
    }
  }

  return (
    <section>
      {!!trip.picks?.length && (
        <div className="mb-6 rounded-3xl bg-white p-4 shadow-card">
          <p className="mb-2 font-display font-bold">In your plan</p>
          <ul className="space-y-2">
            {trip.picks.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand-50 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="mr-2 rounded-full bg-savanna-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase text-savanna-700">{KIND_LABEL[p.kind]}</span>
                  <b>{p.title}</b> <span className="text-ink-muted">· {p.provider} · {PLACE_BY_ID[p.placeId]?.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-display font-semibold">{p.cost ? money(p.cost, currency) : "—"}</span>
                  {byId[p.id] && (
                    <button onClick={() => setBooking(byId[p.id])} className="h-8 rounded-full bg-ink px-3 font-display text-xs font-semibold text-white">
                      Book
                    </button>
                  )}
                  <button onClick={() => unuse(p.id)} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-maasai-50 hover:text-maasai-600" aria-label={`Remove ${p.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3">
        <h2 className="text-xl font-bold">Compare & choose for yourself</h2>
        <p className="text-sm text-ink-muted">Everything bookable at your stops: packages, stays, vehicles, guides and day trips. Add up to 3 to compare side by side, then use one in your plan or book it.</p>
      </div>

      <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-sand-50/95 px-1 py-2 backdrop-blur">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: balloon, Land Cruiser, snorkelling, Bonfire…" className="h-11 w-full rounded-full border border-ink/10 bg-white pl-10 pr-4 text-sm outline-none focus:border-savanna-500" />
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 rounded-full border border-ink/10 bg-white px-3 text-sm" aria-label="Sort">
            <option value="match">Best match</option>
            <option value="price">Cheapest</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cn("h-9 shrink-0 rounded-full px-3.5 font-display text-sm font-semibold", kind === k ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card")}>
              {k === "all" ? "Everything" : KIND_LABEL[k]}
              {items && <span className="ml-1 text-xs opacity-60">{k === "all" ? items.length : items.filter((i) => i.kind === k).length}</span>}
            </button>
          ))}
        </div>
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-muted" />
          <select value={stop} onChange={(e) => setStop(e.target.value)} className="h-8 shrink-0 rounded-full border border-ink/10 bg-white px-2.5 text-xs" aria-label="Stop">
            <option value="all">All stops</option>
            {places.map((p) => (
              <option key={p} value={p}>
                {PLACE_BY_ID[p].name}
              </option>
            ))}
          </select>
          <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="h-8 shrink-0 rounded-full border border-ink/10 bg-white px-2.5 text-xs" aria-label="Budget">
            <option value={0}>Any price</option>
            {[10000, 25000, 50000, 100000, 250000, 500000].map((v) => (
              <option key={v} value={v}>
                Up to {money(v, currency)}
              </option>
            ))}
          </select>
          {presentSources.map((src) => (
            <button key={src} onClick={() => setSources((s) => (s.includes(src) ? s.filter((x) => x !== src) : [...s, src]))} className={cn("h-8 shrink-0 rounded-full border px-3 text-xs font-semibold", sources.includes(src) ? "border-savanna-500 bg-savanna-50 text-savanna-800" : "border-ink/10 bg-white text-ink-soft")}>
              {SOURCE_LABEL[src]}
            </button>
          ))}
        </div>
      </div>

      {!items ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-64 rounded-3xl" />
          ))}
        </div>
      ) : list.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <ItemCard key={i.id} i={i} total={totalFor(i)} places={places} currency={currency} inCompare={compare.includes(i.id)} inPlan={!!trip.picks?.some((p) => p.id === i.id)} onCompare={() => toggleCompare(i.id)} onBook={() => setBooking(i)} onUse={() => use(i)} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-3xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-muted">Nothing matches. Clear a filter or search for something else.</p>
      )}
      {items && (
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
          {online === null ? (
            <>
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-savanna-600" /> Checking operators&apos; own websites (Bonfire Adventures, SafariBookings, TripAdvisor and others) for packages on this route. They&apos;ll appear in the list above. This can take a minute the first time.
            </>
          ) : online.length ? (
            <>
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Includes {online.length} package{online.length === 1 ? "" : "s"} found on operators&apos; websites, marked &quot;Found online&quot;. Prices are as published there; you book on their site.
            </>
          ) : onlineNote ? (
            <>
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {onlineNote}
            </>
          ) : null}
        </p>
      )}
      {items && !affiliates.viator && !affiliates.getyourguide && (
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
          <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Viator and GetYourGuide tours appear here once their partner keys are added.
        </p>
      )}

      {/* compare tray */}
      <AnimatePresence>
        {chosen.length > 0 && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="fixed bottom-20 left-3 right-3 z-40 mx-auto flex max-w-2xl items-center gap-2 rounded-3xl bg-ink p-2 pl-4 text-white shadow-lift lg:bottom-6">
            <Columns3 className="h-5 w-5 shrink-0 text-savanna-300" />
            <div className="scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {chosen.map((c) => (
                <span key={c.id} className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-xs">
                  <span className="max-w-[140px] truncate">{c.title}</span>
                  <button onClick={() => toggleCompare(c.id)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/20" aria-label={`Remove ${c.title}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <button onClick={() => setShowCompare(true)} disabled={chosen.length < 2} className="h-10 shrink-0 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold disabled:opacity-50">
              Compare {chosen.length}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] overflow-y-auto bg-night/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && setShowCompare(false)}>
            <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-4 shadow-lift sm:p-6" role="dialog" aria-modal="true" aria-label="Compare side by side">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Side by side</h2>
                <button onClick={() => setShowCompare(false)} className="grid h-10 w-10 place-items-center rounded-full border border-ink/10" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CompareTable items={chosen} trip={trip} places={places} totalFor={totalFor} currency={currency} onUse={use} onBook={(i) => setBooking(i)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookingSheet
        key={booking?.id ?? "none"}
        item={booking}
        open={!!booking}
        onClose={() => setBooking(null)}
        alternatives={
          booking
            ? (all ?? [])
                .filter((i) => i.id !== booking.id && i.book.mode === "external" && i.kind === booking.kind && i.places.some((p) => booking.places.includes(p)))
                .sort((a, b) => (groupPrice(a, trip.travelers, defaultQuantity(a, 1)) ?? Infinity) - (groupPrice(b, trip.travelers, defaultQuantity(b, 1)) ?? Infinity))
                .slice(0, 3)
            : []
        }
        tripId={trip.id}
        date={booking ? firstDateAt(trip, booking.places.find((p) => places.includes(p)) ?? places[0]) : trip.startDate}
        nights={booking ? nightsAt(booking.places[0]) : 1}
        travelers={trip.travelers}
        currency={currency}
        onBooked={(ref) => {
          if (!booking || !trip.picks?.some((p) => p.id === booking.id)) return;
          onChange({ ...trip, picks: trip.picks.map((p) => (p.id === booking.id ? { ...p, ref } : p)), updatedAt: Date.now() });
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="fixed bottom-24 left-1/2 z-[95] max-w-md -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lift lg:bottom-8">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-savanna-300" />
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

function Badges({ i }: { i: CatalogItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      <span className={cn("rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide", i.source === "web" ? "bg-dusk-50 text-dusk-500" : i.source === "tembea" ? "bg-savanna-50 text-savanna-700" : "bg-sand-100 text-ink-soft")}>{SOURCE_LABEL[i.source]}</span>
      {i.sponsored && <span className="rounded-full bg-ochre-400 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink">Sponsored</span>}
      {i.demo && <span className="rounded-full bg-sand-100 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-ink-muted">Sample</span>}
    </div>
  );
}

function ItemCard({ i, total, places, currency, inCompare, inPlan, onCompare, onBook, onUse }: { i: CatalogItem; total?: number; places: string[]; currency: Currency; inCompare: boolean; inPlan: boolean; onCompare: () => void; onBook: () => void; onUse: () => void }) {
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-3xl bg-white shadow-card", inCompare && "ring-2 ring-savanna-500")}>
      {i.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img(i.image)} alt="" loading="lazy" className="h-32 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <Badges i={i} />
        <h3 className="mt-2 font-display text-sm font-bold leading-snug">{i.title}</h3>
        <p className="text-xs text-ink-muted">
          {i.provider}
          {i.durationText ? ` · ${i.durationText}` : ""}
          {i.rating ? (
            <>
              {" · "}
              <Star className="inline h-3 w-3 fill-ochre-400 text-ochre-400" /> {i.rating.toFixed(1)}
              {i.reviews ? ` (${i.reviews})` : ""}
            </>
          ) : null}
        </p>
        {i.kind === "package" && (
          <div className="mt-2 flex flex-wrap gap-1">
            {places.map((p) => (
              <span key={p} className={cn("rounded-full px-2 py-0.5 text-[11px]", i.places.includes(p) ? "bg-savanna-50 text-savanna-700" : "bg-sand-50 text-ink-muted line-through")}>
                {PLACE_BY_ID[p]?.name}
              </span>
            ))}
          </div>
        )}
        {i.includes.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{i.includes.join(" · ")}</p>}
        <div className="mt-auto pt-3">
          <p className="font-display text-lg font-bold">
            {total ? money(total, currency) : i.priceText ?? "Price on request"}
            {total && <span className="ml-1 text-xs font-normal text-ink-muted">for your group</span>}
          </p>
          {i.price ? (
            <p className="text-xs text-ink-muted">
              {i.priceText ?? money(i.price, currency)} {UNIT_TEXT[i.unit] ?? i.unit}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button onClick={onCompare} className={cn("inline-flex h-9 items-center gap-1 rounded-full border px-3 font-display text-xs font-semibold", inCompare ? "border-savanna-500 bg-savanna-50 text-savanna-800" : "border-ink/15")}>
              {inCompare ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Compare
            </button>
            <button onClick={onUse} disabled={inPlan} className="inline-flex h-9 items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold disabled:opacity-50">
              {inPlan ? "In your plan" : "Use in my trip"}
            </button>
            <button onClick={onBook} className="inline-flex h-9 items-center rounded-full bg-ink px-3.5 font-display text-xs font-semibold text-white">
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CompareTable({ items, trip, places, totalFor, currency, onUse, onBook }: { items: CatalogItem[]; trip: Trip; places: string[]; totalFor: (i: CatalogItem) => number | undefined; currency: Currency; onUse: (i: CatalogItem) => void; onBook: (i: CatalogItem) => void }) {
  const totals = items.map(totalFor);
  const cheapest = Math.min(...totals.filter((t): t is number => !!t));
  const best = Math.max(...items.map((i) => i.rating ?? 0));
  const rows: { label: string; cell: (i: CatalogItem, k: number) => React.ReactNode }[] = [
    { label: "Type", cell: (i) => KIND_LABEL[i.kind] },
    { label: "From", cell: (i) => `${i.provider} · ${SOURCE_LABEL[i.source]}${i.sponsored ? " · Sponsored" : ""}${i.demo ? " · Sample" : ""}` },
    { label: `For your group (${trip.travelers})`, cell: (i, k) => <span className={cn("font-display font-bold", totals[k] === cheapest && "text-savanna-700")}>{totals[k] ? money(totals[k]!, currency) : i.priceText ?? "On request"}{totals[k] === cheapest && items.length > 1 ? " · lowest" : ""}</span> },
    { label: "Price", cell: (i) => (i.price ? (i.priceText && /\b(pp|per|each|pax)\b/i.test(i.priceText) ? i.priceText : `${i.priceText ?? money(i.price, currency)} ${UNIT_TEXT[i.unit] ?? i.unit}`) : i.priceText ?? "—") },
    { label: "Length", cell: (i) => i.durationText ?? (i.days ? `${i.days} days` : "—") },
    { label: "Your stops covered", cell: (i) => <ul className="space-y-0.5">{places.map((p) => <li key={p} className={i.places.includes(p) ? "" : "text-ink-muted line-through"}>{i.places.includes(p) ? "✓ " : ""}{PLACE_BY_ID[p]?.name ?? p}</li>)}</ul> },
    { label: "Included", cell: (i) => (i.includes.length ? <ul className="list-disc space-y-0.5 pl-4">{i.includes.map((x) => <li key={x}>{x}</li>)}</ul> : "—") },
    { label: "Not included", cell: (i) => (i.excludes.length ? i.excludes.join(", ") : "—") },
    { label: "Rating", cell: (i) => (i.rating ? <span className={cn(i.rating === best && items.length > 1 && "font-semibold text-savanna-700")}>{i.rating.toFixed(1)}{i.reviews ? ` (${i.reviews} reviews)` : ""}</span> : "—") },
    { label: "Cancellation / terms", cell: (i) => i.cancellation ?? "Ask the provider" },
    { label: "Languages", cell: (i) => i.languages?.join(", ") || "—" },
  ];
  // GSMArena-style: on phones each spec's label sits on its own line above the options, so all
  // options stay side by side; from tablet up the labels move into a column on the left.
  const cols = "grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-x-2 sm:grid-cols-[9rem_repeat(var(--n),minmax(0,1fr))] sm:gap-x-3";
  const vars = { "--n": items.length } as React.CSSProperties;
  return (
    <div className="text-[13px] sm:text-sm">
      <div className={cols} style={vars}>
        <div className="hidden sm:block" />
        {items.map((i) => (
          <div key={i.id} className="min-w-0 pb-2">
            {i.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img(i.image)} alt="" className="mb-2 h-16 w-full rounded-xl object-cover sm:h-24 sm:rounded-2xl" />
            )}
            <div className="hidden sm:block">
              <Badges i={i} />
            </div>
            <p className="mt-1 line-clamp-3 font-display text-xs font-bold leading-snug sm:text-sm">{i.title}</p>
            <p className="truncate text-[11px] text-ink-muted sm:hidden">{i.provider}</p>
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.label} className={cn(cols, "border-t border-ink/[0.06] py-2")} style={vars}>
          <div className="col-span-full pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:col-span-1 sm:pb-0 sm:text-xs">{r.label}</div>
          {items.map((i, k) => (
            <div key={i.id} className="min-w-0 break-words">
              {r.cell(i, k)}
            </div>
          ))}
        </div>
      ))}
      <div className={cn(cols, "sticky bottom-0 border-t border-ink/[0.06] bg-white py-3")} style={vars}>
        <div className="hidden sm:block" />
        {items.map((i) => (
          <div key={i.id} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            <button onClick={() => onUse(i)} className="h-10 rounded-full bg-savanna-500 px-3 font-display text-xs font-semibold text-white sm:px-4">
              Use in my trip
            </button>
            <button onClick={() => onBook(i)} className="h-10 rounded-full bg-ink px-3 font-display text-xs font-semibold text-white sm:px-4">
              Book
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
