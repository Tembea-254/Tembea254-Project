"use client";

import { Car, Compass, Loader2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { LiveOffer, LiveResult, SearchLink } from "@/lib/live-offers";
import type { Trip } from "@/lib/planner/types";
import { groupPrice, normalizeItem, SOURCE_LABEL, UNIT_TEXT, type CatalogItem } from "@/lib/catalog-types";
import { cn, money, type Currency } from "@/lib/utils";
import { BookingSheet } from "./booking-sheet";

type Live = LiveResult & { links: SearchLink[] };
const memo = new Map<string, Promise<Live>>();

export function fetchLive(qs: string) {
  if (!memo.has(qs))
    memo.set(
      qs,
      fetch(`/api/live?${qs}`)
        .then(async (r) => (r.ok ? ((d: Partial<Live>) => ({ ...d, offers: Array.isArray(d.offers) ? d.offers : [], links: Array.isArray(d.links) ? d.links : [] }) as Live)(await r.json()) : ({ status: "error", offers: [], links: [], note: r.status === 401 ? "Sign in to see live prices." : undefined } as Live)))
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

export function Searching({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-3xl bg-white p-4 text-sm text-ink-muted shadow-card">
      <Loader2 className="h-4 w-4 animate-spin text-savanna-600" /> {text}
    </p>
  );
}

const CATS = [
  { kind: "transport", label: "Vehicles & transfers", icon: Car },
  { kind: "guide", label: "Guides", icon: UserRound },
  { kind: "tour", label: "Day trips & excursions", icon: Compass },
] as const;

/** An offer found on an operator's site, as a comparable listing. Packages cover every trip stop they name. */
export const fromLive = (o: LiveOffer, i: number, tripPlaces: string[] = []): CatalogItem => ({
  id: `live:${o.kind}:${o.placeId ?? ""}:${i}:${o.url.slice(-24)}`,
  source: "web",
  kind: o.kind === "package" ? (tripPlaces.length ? "package" : "tour") : o.kind,
  title: o.title,
  provider: o.provider,
  places: [...new Set([...(o.placeId ? [o.placeId] : []), ...tripPlaces.filter((p) => mentions(`${o.title} ${(o.includes ?? []).join(" ")}`, p))])],
  price: o.priceKes,
  priceText: o.priceText,
  days: o.days,
  durationText: o.days ? `${o.days} days` : undefined,
  unit: o.per === "vehicle/day" ? "vehicle/day" : o.per === "group" ? "group" : o.per === "day" ? "day" : "person",
  includes: o.includes ?? [],
  excludes: [],
  book: { mode: "external", go: o.go },
});
const mentions = (text: string, placeId: string) => {
  const name = PLACE_BY_ID[placeId]?.name;
  if (!name) return false;
  const t = text.toLowerCase();
  // "Maasai Mara" also matches "Masai Mara" / "Mara"; "Diani Beach" matches "Diani"
  return name
    .toLowerCase()
    .replace("maasai", "masai")
    .split(/\s+/)
    .some((w) => w.length > 3 && w !== "beach" && w !== "lake" && w !== "national" && t.replace("maasai", "masai").includes(w));
};

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
      .then((d: { items?: CatalogItem[] }) => on && setCatalog((d.items ?? []).map(normalizeItem).filter((i) => i.source !== "web" && i.kind !== "stay" && i.kind !== "package")))
      .catch(() => on && setCatalog([]));
    return () => {
      on = false;
    };
  }, [placeId]);
  const name = PLACE_BY_ID[placeId]?.name ?? placeId;
  const all = [...(catalog ?? []), ...(data?.offers ?? []).filter((o) => o.kind !== "package").map((o, i) => normalizeItem(fromLive(o, i)))];
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
                  {!rows.length && <li className="text-xs text-ink-muted">No providers listed here yet.</li>}
                </ul>
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
