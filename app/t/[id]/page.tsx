import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BedDouble, CalendarDays, ExternalLink, Headset, MapPin, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { getDb, schema as s } from "@/lib/db";
import { placeMedia } from "@/lib/data/place-media";
import { PLACE_BY_ID } from "@/lib/data/places";
import { bookingUrl } from "@/lib/planner/compare";
import { BUFFER_PCT } from "@/lib/planner/engine";
import type { Trip } from "@/lib/planner/types";
import { addDays, fmtDate, money, unsplash } from "@/lib/utils";

/**
 * Read-only itinerary anyone with the link can open: for a traveller sharing with friends, or a
 * tour operator sending a plan to a client. The link is unguessable; nothing personal is shown.
 */
export const dynamic = "force-dynamic";

async function load(id: string) {
  const db = await getDb();
  const row = (await db.select({ data: s.trips.data }).from(s.trips).where(eq(s.trips.id, id.slice(0, 40))))[0];
  return row?.data as Trip | undefined;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const trip = await load(params.id).catch(() => undefined);
  return { title: trip ? `${trip.title} · Tembea254` : "Itinerary · Tembea254", robots: { index: false } };
}

export default async function SharedTrip({ params }: { params: { id: string } }) {
  const trip = await load(params.id);
  if (!trip) notFound();
  const total = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const start = trip.days[0]?.date ?? trip.startDate;
  const end = trip.days[trip.days.length - 1]?.date ?? trip.startDate;
  const rooms = Math.max(1, Math.ceil(trip.travelers / 2));
  let offset = 0;

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="relative overflow-hidden bg-night text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trip.cover.startsWith("http") ? trip.cover : unsplash(trip.cover, 1600, 700)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/20" />
        <div className="container-page relative pb-10 pt-6">
          <Link href="/" aria-label="Tembea254">
            <Logo className="h-9" light />
          </Link>
          <p className="mt-10 font-display text-xs font-semibold uppercase tracking-[0.2em] text-savanna-300">Kenya itinerary</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">{trip.title}</h1>
          <p className="mt-2 text-white/75">{trip.stops.map((st) => PLACE_BY_ID[st.placeId]?.name).join(" · ")}</p>
          <dl className="mt-6 flex flex-wrap gap-3 text-sm">
            {[
              { icon: CalendarDays, v: `${fmtDate(start, { day: "numeric", month: "short" })} – ${fmtDate(end, { day: "numeric", month: "short", year: "numeric" })}` },
              { icon: MapPin, v: `${trip.stops.length} stops · ${trip.days.length} days` },
              { icon: Users, v: `${trip.travelers} travellers` },
              { icon: Wallet, v: `About ${money(total)}` },
            ].map((x) => (
              <div key={x.v} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 backdrop-blur">
                <x.icon className="h-4 w-4 text-savanna-300" /> {x.v}
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <h2 className="text-xl font-bold">Day by day</h2>
          {trip.days.map((d, i) => (
            <section key={d.id} className="overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-4 py-2.5 text-sm text-white">
                <span className="font-display font-bold">
                  Day {i + 1} · {fmtDate(d.date)}
                </span>
                <span className="text-white/70">{PLACE_BY_ID[d.placeId]?.name}</span>
              </div>
              <div className="p-4">
                <p className="mb-2 font-display font-semibold">{d.title}</p>
                <ul className="space-y-1.5 text-sm">
                  {d.items.map((it) => (
                    <li key={it.id} className="grid grid-cols-[3rem_1fr] gap-2">
                      <span className="font-display font-semibold text-savanna-700">{it.time}</span>
                      <span>
                        {it.title}
                        {it.notes && <span className="block text-xs text-ink-muted">{it.notes}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-3 font-display font-bold">Stops, stays and 360° previews</h2>
            <ol className="space-y-3">
              {trip.stops.map((st, i) => {
                const p = PLACE_BY_ID[st.placeId];
                const m = placeMedia(st.placeId);
                const from = addDays(trip.startDate, offset);
                offset += st.nights;
                return (
                  <li key={st.id} className="rounded-2xl bg-sand-50 p-3">
                    <p className="font-display text-sm font-bold">
                      {i + 1}. {p?.name} <span className="font-normal text-ink-muted">· {fmtDate(from, { day: "numeric", month: "short" })} · {st.nights}n</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                      <BedDouble className="h-3.5 w-3.5" /> {st.stay} · about {money(st.stayPerNight * st.nights * rooms)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <a href={bookingUrl(st.stay, p?.name ?? "")} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-full border border-ink/15 bg-white px-2.5 text-xs font-semibold">
                        Live price <ExternalLink className="h-3 w-3" />
                      </a>
                      {m.vrSlug && (
                        <Link href={`/vr/${m.vrSlug}`} className="inline-flex h-7 items-center gap-1 rounded-full bg-savanna-500 px-2.5 text-xs font-semibold text-white">
                          <Headset className="h-3 w-3" /> 360° preview
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="rounded-3xl bg-white p-4 shadow-card">
            <h2 className="font-display font-bold">Estimated cost</h2>
            <p className="mt-1 font-display text-2xl font-bold">{money(total)}</p>
            <p className="text-xs text-ink-muted">
              {money(total / trip.travelers)} per person. Includes a {Math.round(BUFFER_PCT * 100)}% buffer for price changes and tips. Confirm prices before paying.
            </p>
          </section>
          <Link href="/planner" className="block rounded-3xl bg-ink p-4 text-white">
            <p className="font-display font-bold">Plan your own Kenya trip</p>
            <p className="mt-1 text-sm text-white/70">Free AI planner with 360° pre-visits of every stop.</p>
          </Link>
        </aside>
      </main>
    </div>
  );
}
