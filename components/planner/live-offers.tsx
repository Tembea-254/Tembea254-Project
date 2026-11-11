"use client";

import { Car, Compass, ExternalLink, Globe, Loader2, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { LiveOffer, LiveResult, SearchLink } from "@/lib/live-offers";
import type { Trip } from "@/lib/planner/types";
import { groupPrice, SOURCE_LABEL, UNIT_TEXT, type CatalogItem } from "@/lib/catalog-types";
import { cn, money, type Currency } from "@/lib/utils";
import { BookingSheet } from "./booking-sheet";

type Live = LiveResult & { links: SearchLink[] };
const memo = new Map<string, Promise<Live>>();

function fetchLive(qs: string) {
  if (!memo.has(qs))
    memo.set(
      qs,
      fetch(`/api/live?${qs}`)
        .then(async (r) => (r.ok ? ((await r.json()) as Live) : ({ status: "error", offers: [], links: [], note: r.status === 401 ? "Sign in to see live prices." : undefined } as Live)))
        .catch(() => ({ status: "error", offers: [], links: [] }) as Live),
    );
  return memo.get(qs)!;
}

export const fromParam = (t: Pick<Trip, "origin">) => (t.origin?.kind === "kenya" ? `kenya:${t.origin.city ?? "nairobi"}` : `abroad:${t.origin?.country ?? ""}`);
const ago = (iso?: string) => {
  if (!iso) return "";
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  return h < 1 ? "just now" : `${h}h ago`;
};
const domain = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function OfferCard({ o, travelers, currency, badge }: { o: LiveOffer; travelers: number; currency: Currency; badge?: string }) {
  const total = o.priceKes && o.per === "person" ? o.priceKes * travelers : undefined;
  return (
    <article className="flex flex-col rounded-3xl bg-white p-4 shadow-card">
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-dusk-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-dusk-500">
          <Globe className="h-3 w-3" /> Live from {domain(o.url)}
        </span>
        {badge && <span className="rounded-full bg-savanna-50 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-savanna-700">{badge}</span>}
      </div>
      <h3 className="mt-2 font-display text-sm font-bold leading-snug">{o.title}</h3>
      <p className="text-xs text-ink-muted">
        {o.provider}
        {o.days ? ` · ${o.days} days` : ""}
        {o.placeId ? ` · ${PLACE_BY_ID[o.placeId]?.name}` : ""}
      </p>
      {o.includes.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{o.includes.join(" · ")}</p>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
        <div>
          <p className="font-display text-base font-bold">{o.priceText}</p>
          {total ? <p className="text-xs text-ink-muted">about {money(total, currency)} for {travelers}</p> : o.priceKes && o.priceText.indexOf("KES") < 0 ? <p className="text-xs text-ink-muted">about {money(o.priceKes, currency)}</p> : null}
        </div>
        <a href={o.go} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 font-display text-xs font-semibold text-white">
          View &amp; book <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

function Links({ links }: { links: SearchLink[] }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a key={l.go} href={l.go} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-xs font-semibold hover:border-savanna-400">
          <Search className="h-3.5 w-3.5 text-savanna-600" /> {l.provider}: {l.label}
        </a>
      ))}
    </div>
  );
}

function Searching({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-3xl bg-white p-4 text-sm text-ink-muted shadow-card">
      <Loader2 className="h-4 w-4 animate-spin text-savanna-600" /> {text}
    </p>
  );
}

/** Packages found live on operators' websites for this route, compared by price. */
export function LivePackages({ trip, currency }: { trip: Trip; currency: Currency }) {
  const places = [...new Set(trip.stops.map((s) => s.placeId))];
  const qs = new URLSearchParams({ type: "packages", places: places.join(","), days: String(trip.days.length), travelers: String(trip.travelers), budget: trip.budget, from: fromParam(trip) }).toString();
  const [data, setData] = useState<Live | null>(null);
  useEffect(() => {
    let on = true;
    setData(null);
    fetchLive(qs).then((d) => on && setData(d));
    return () => {
      on = false;
    };
  }, [qs]);

  const priced = (data?.offers ?? []).filter((o) => o.priceKes);
  const cheapest = priced.length ? priced.reduce((a, b) => ((b.priceKes ?? 0) / (b.days || 1) < (a.priceKes ?? 0) / (a.days || 1) ? b : a)) : null;
  return (
    <section>
      <h2 className="text-xl font-bold">Live packages from operators&apos; websites</h2>
      <p className="mb-3 text-sm text-ink-muted">
        Real offers and prices our AI found online for this route{trip.origin?.kind === "kenya" ? ", with resident rates where offered" : ""}. Booking happens on the operator&apos;s own site.
        {data?.fetchedAt && <span> Checked {ago(data.fetchedAt)}.</span>}
      </p>
      {!data ? (
        <Searching text="Searching operators' websites for live prices. This takes up to a minute the first time." />
      ) : data.offers.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.offers
            .filter((o) => o.kind === "package")
            .sort((a, b) => (a.priceKes ?? 9e9) - (b.priceKes ?? 9e9))
            .map((o) => (
              <OfferCard key={o.url + o.title} o={o} travelers={trip.travelers} currency={currency} badge={o === cheapest ? "Best value per day" : undefined} />
            ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-ink/15 p-4 text-sm text-ink-muted">{data.note ?? "No live packages found for this exact route."} Compare on the big platforms instead:</p>
      )}
      {data && data.links.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Compare more on</p>
          <Links links={data.links.filter((l, i, a) => a.findIndex((x) => x.provider === l.provider) === i)} />
        </div>
      )}
    </section>
  );
}

const CATS = [
  { kind: "transport", label: "Vehicles & transfers", icon: Car },
  { kind: "guide", label: "Guides", icon: UserRound },
  { kind: "tour", label: "Day trips & excursions", icon: Compass },
] as const;

const fromLive = (o: LiveOffer, i: number): CatalogItem => ({
  id: `live:${o.placeId ?? ""}:${i}`,
  source: "web",
  kind: o.kind === "package" ? "tour" : o.kind,
  title: o.title,
  provider: o.provider,
  places: o.placeId ? [o.placeId] : [],
  price: o.priceKes,
  priceText: o.priceText,
  unit: o.per === "vehicle/day" ? "vehicle/day" : o.per === "group" ? "group" : o.per === "day" ? "day" : "person",
  includes: o.includes,
  excludes: [],
  book: { mode: "external", go: o.go },
});

/**
 * Transport, guides and day trips at one stop, side by side: Tembea254 guides and drivers with their
 * hourly/daily rates, partner vehicles, affiliate tours and offers found online. "Book" opens the
 * booking form (or the provider's site for online offers); nothing sends the traveller to a dead end.
 */
export function LocalServices({ placeId, travelers, nights, currency, compact, tripId, date }: { placeId: string; travelers: number; nights: number; currency: Currency; compact?: boolean; tripId?: string; date?: string }) {
  const [data, setData] = useState<Live | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [booking, setBooking] = useState<CatalogItem | null>(null);
  useEffect(() => {
    let on = true;
    setData(null);
    setCatalog(null);
    fetchLive(new URLSearchParams({ type: "local", place: placeId }).toString()).then((d) => on && setData(d));
    fetch(`/api/catalog?places=${placeId}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: CatalogItem[] }) => on && setCatalog(d.items.filter((i) => i.source !== "web" && i.kind !== "stay" && i.kind !== "package")))
      .catch(() => on && setCatalog([]));
    return () => {
      on = false;
    };
  }, [placeId]);
  const name = PLACE_BY_ID[placeId]?.name ?? placeId;
  const all = [...(catalog ?? []), ...(data?.offers ?? []).filter((o) => o.kind !== "package").map(fromLive)];
  const qty = (i: CatalogItem) => (i.unit === "vehicle/day" || i.unit === "day" ? Math.max(1, nights) : 1);

  return (
    <div className={cn(!compact && "rounded-3xl bg-sand-50 p-4")}>
      {!compact && <h3 className="mb-3 font-display font-bold">Getting around {name}: transport, guides & tours</h3>}
      {!catalog ? (
        <Searching text={`Finding transport, guides and tours in ${name}…`} />
      ) : (
        <div className={cn("grid gap-3", !compact && "lg:grid-cols-3")}>
          {CATS.map((c) => {
            const rows = all.filter((i) => i.kind === c.kind).sort((a, b) => (a.price ?? 9e9) - (b.price ?? 9e9));
            const links = (data?.links ?? []).filter((l) => l.kind === c.kind);
            return (
              <div key={c.kind} className="min-w-0 rounded-2xl bg-white p-3 shadow-card">
                <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
                  <c.icon className="h-4 w-4 text-savanna-600" /> {c.label}
                  <span className="text-xs font-normal text-ink-muted">{rows.length ? `${rows.length} to compare` : ""}</span>
                </p>
                <ul className="space-y-2">
                  {rows.slice(0, 6).map((o, k) => (
                    <li key={o.id} className="rounded-xl bg-sand-50 p-2.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <span className={cn("rounded-full px-1.5 py-0.5 font-display text-[9px] font-bold uppercase", o.source === "web" ? "bg-dusk-50 text-dusk-500" : o.source === "tembea" ? "bg-savanna-50 text-savanna-700" : "bg-white text-ink-soft")}>{SOURCE_LABEL[o.source]}</span>
                        {o.sponsored && <span className="rounded-full bg-ochre-400 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase">Sponsored</span>}
                        {o.demo && <span className="rounded-full bg-white px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-ink-muted">Sample</span>}
                        {k === 0 && rows.length > 1 && o.price ? <span className="rounded-full bg-savanna-500 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-white">Lowest rate</span> : null}
                      </div>
                      <p className="mt-1 font-semibold leading-snug">{o.provider}</p>
                      <p className="text-xs text-ink-muted">
                        {o.title}
                        {o.languages?.length ? ` · ${o.languages.join(", ")}` : ""}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="font-display font-bold">
                          {o.price ? o.priceText ?? money(o.price, currency) : o.priceText ?? "On request"}
                          <span className="text-xs font-normal text-ink-muted"> {UNIT_TEXT[o.unit] ?? o.unit}</span>
                          {o.price && qty(o) > 1 && <span className="block text-[11px] font-normal text-ink-muted">{money((groupPrice(o, travelers, qty(o)) ?? 0), currency)} for {qty(o)} days</span>}
                        </span>
                        <button onClick={() => setBooking(o)} className="h-8 shrink-0 rounded-full bg-ink px-3 font-display text-xs font-semibold text-white">
                          Book
                        </button>
                      </div>
                    </li>
                  ))}
                  {!rows.length && <li className="text-xs text-ink-muted">No listed providers here yet. Compare on:</li>}
                </ul>
                {links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink/[0.06] pt-2">
                    {links.map((l) => (
                      <a key={l.go} href={l.go} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-savanna-700">
                        <Search className="h-3 w-3" /> {l.provider}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data?.fetchedAt && <p className="mt-2 text-[11px] text-ink-muted">Online prices checked {ago(data.fetchedAt)}. Confirm with the provider before paying.</p>}
      <BookingSheet key={booking?.id ?? "none"} item={booking} open={!!booking} onClose={() => setBooking(null)} tripId={tripId} date={date ?? new Date().toISOString().slice(0, 10)} nights={nights} travelers={travelers} currency={currency} />
    </div>
  );
}
