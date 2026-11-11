"use client";

import { Car, Compass, ExternalLink, Globe, Loader2, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { LiveOffer, LiveResult, SearchLink } from "@/lib/live-offers";
import type { Trip } from "@/lib/planner/types";
import type { OfferView } from "@/lib/repo/partners";
import { cn, money, type Currency } from "@/lib/utils";
import { loadOffers } from "./offers-client";

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
  { kind: "guide", label: "Tour guides", icon: UserRound },
  { kind: "tour", label: "Day trips & excursions", icon: Compass },
] as const;

/** Transport, guides and day trips at one stop: live offers, partner listings and search links, side by side. */
export function LocalServices({ placeId, travelers, nights, currency, compact }: { placeId: string; travelers: number; nights: number; currency: Currency; compact?: boolean }) {
  const qs = new URLSearchParams({ type: "local", place: placeId }).toString();
  const [data, setData] = useState<Live | null>(null);
  const [partners, setPartners] = useState<OfferView[]>([]);
  useEffect(() => {
    let on = true;
    setData(null);
    fetchLive(qs).then((d) => on && setData(d));
    loadOffers()
      .then((o) => on && setPartners(o.filter((x) => x.kind === "transport" && x.places.includes(placeId))))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [qs, placeId]);
  const name = PLACE_BY_ID[placeId]?.name ?? placeId;

  return (
    <div className={cn(!compact && "rounded-3xl bg-sand-50 p-4")}>
      {!compact && <h3 className="mb-3 font-display font-bold">Getting around {name}: transport, guides & tours</h3>}
      {!data ? (
        <Searching text={`Finding transport, guides and tours in ${name}…`} />
      ) : (
        <div className={cn("grid gap-3", !compact && "lg:grid-cols-3")}>
          {CATS.map((c) => {
            const live = data.offers.filter((o) => o.kind === c.kind).sort((a, b) => (a.priceKes ?? 9e9) - (b.priceKes ?? 9e9));
            const links = data.links.filter((l) => l.kind === c.kind);
            const partnerCards = c.kind === "transport" ? partners : [];
            return (
              <div key={c.kind} className="min-w-0 rounded-2xl bg-white p-3 shadow-card">
                <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
                  <c.icon className="h-4 w-4 text-savanna-600" /> {c.label}
                </p>
                <ul className="space-y-2">
                  {partnerCards.map((o) => (
                    <li key={o.id} className="rounded-xl bg-sand-50 p-2.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {o.partner.sponsored && <span className="rounded-full bg-ochre-400 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase">Sponsored</span>}
                        {o.partner.demo && <span className="rounded-full bg-white px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-ink-muted">Sample listing</span>}
                      </div>
                      <p className="mt-1 font-semibold leading-snug">{o.title}</p>
                      <p className="text-xs text-ink-muted">{o.partner.name}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="font-display font-bold">
                          {money(o.pricePerPerson, currency)}
                          <span className="text-xs font-normal text-ink-muted">/day · {money(o.pricePerPerson * Math.max(1, nights), currency)} for {Math.max(1, nights)}d</span>
                        </span>
                        <a href={`/api/go?offer=${o.id}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-savanna-700 underline">
                          Book
                        </a>
                      </div>
                    </li>
                  ))}
                  {live.slice(0, 4).map((o, i) => (
                    <li key={o.url + o.title} className="rounded-xl bg-sand-50 p-2.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full bg-dusk-50 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-dusk-500">Live · {domain(o.url)}</span>
                        {i === 0 && live.length > 1 && o.priceKes && <span className="rounded-full bg-savanna-50 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-savanna-700">Lowest price</span>}
                      </div>
                      <p className="mt-1 font-semibold leading-snug">{o.title}</p>
                      <p className="text-xs text-ink-muted">{o.provider}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="font-display font-bold">{o.priceText}</span>
                        <a href={o.go} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-savanna-700 underline">
                          Book
                        </a>
                      </div>
                    </li>
                  ))}
                  {!partnerCards.length && !live.length && <li className="text-xs text-ink-muted">{data.status === "live" ? "No priced offers found online yet. Compare here:" : "Compare live prices here:"}</li>}
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
      {data?.fetchedAt && <p className="mt-2 text-[11px] text-ink-muted">Live prices checked {ago(data.fetchedAt)}. Confirm on the provider&apos;s site before paying.</p>}
      {travelers > 6 && <p className="mt-1 text-[11px] text-ink-muted">For {travelers} people you may need two vehicles.</p>}
    </div>
  );
}
