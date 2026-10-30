import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { deleteTrip } from "../../actions";
import { Submit } from "@/components/admin/client";
import { PageHeader, Panel, kes, when } from "@/components/admin/kit";
import { PLACE_BY_ID } from "@/lib/data/places";
import { getDb, schema as s } from "@/lib/db";
import type { Trip } from "@/lib/planner/types";

export default async function TripDetail({ params }: { params: { id: string } }) {
  const db = await getDb();
  const row = (await db.select({ t: s.trips, email: s.users.email }).from(s.trips).leftJoin(s.users, eq(s.users.id, s.trips.userId)).where(eq(s.trips.id, params.id)))[0];
  if (!row) notFound();
  const trip = row.t.data as Trip;
  return (
    <>
      <Link href="/admin/trips" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All trips
      </Link>
      <PageHeader
        title={trip.title}
        text={`${row.email ?? "Unknown traveller"} · ${trip.travelers} travellers · updated ${when(row.t.updatedAt)}`}
        actions={
          <form action={deleteTrip}>
            <input type="hidden" name="id" value={row.t.id} />
            <input type="hidden" name="back" value="1" />
            <Submit tone="danger" confirm="Delete this trip?">
              Delete trip
            </Submit>
          </form>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel title="Day by day">
          <ol className="space-y-3">
            {trip.days.map((d, i) => (
              <li key={d.id} className="rounded-2xl bg-sand-50 p-3">
                <p className="font-display text-sm font-bold">
                  Day {i + 1} · {PLACE_BY_ID[d.placeId]?.name ?? d.placeId} <span className="font-normal text-ink-muted">· {d.title}</span>
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                  {d.items.map((it) => (
                    <li key={it.id}>
                      <span className="font-mono text-xs text-ink-muted">{it.time}</span> {it.title}
                      {it.cost ? <span className="text-xs text-ink-muted"> · {kes(it.cost)}</span> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="space-y-4">
          <Panel title="Stops & stays">
            <ul className="space-y-2 text-sm">
              {trip.stops.map((st) => (
                <li key={st.id}>
                  <strong>{PLACE_BY_ID[st.placeId]?.name ?? st.placeId}</strong> · {st.nights} night{st.nights === 1 ? "" : "s"}
                  <span className="block text-xs text-ink-muted">
                    {st.stay} · {kes(st.stayPerNight)}/night
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Budget">
            <ul className="space-y-1 text-sm">
              {Object.entries(trip.planned).map(([k, v]) => (
                <li key={k} className="flex justify-between capitalize">
                  {k} <span>{kes(v)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-ink/10 pt-1 font-semibold">
                Total <span>{kes(row.t.totalKes)}</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
