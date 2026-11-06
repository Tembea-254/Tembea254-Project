import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { deleteTrip } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, PageHeader, Panel, SearchBox, Stat, kes, when } from "@/components/admin/kit";
import { PLACE_BY_ID } from "@/lib/data/places";
import { getDb, schema as s } from "@/lib/db";
import { Route, Sparkles, Users } from "lucide-react";

export const metadata = { title: "Trip planner" };

export default async function TripsAdmin({ searchParams }: { searchParams: { q?: string } }) {
  const db = await getDb();
  const q = (searchParams.q || "").trim();
  const [rows, totals, popular] = await Promise.all([
    db
      .select({ t: s.trips, email: s.users.email, name: s.users.name })
      .from(s.trips)
      .leftJoin(s.users, eq(s.users.id, s.trips.userId))
      .where(q ? or(ilike(s.trips.title, `%${q}%`), ilike(s.users.email, `%${q}%`)) : undefined)
      .orderBy(desc(s.trips.updatedAt))
      .limit(200),
    db.select({ n: sql<number>`count(*)::int`, travellers: sql<number>`coalesce(sum(${s.trips.travelers}),0)::int`, avgDays: sql<number>`coalesce(round(avg(${s.trips.days})::numeric,1),0)::float`, ai: sql<number>`count(*) filter (where ${s.trips.source} = 'ai')::int` }).from(s.trips),
    db.select({ place: sql<string>`unnest(${s.trips.stops})`, n: sql<number>`count(*)::int` }).from(s.trips).groupBy(sql`1`).orderBy(sql`2 desc`).limit(8),
  ]);
  const t = totals[0];
  return (
    <>
      <PageHeader title="Trip planner" text="Trips travellers have planned (saved to their accounts). Use this to see demand by destination." />
      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
        <Stat label="Trips" value={t.n} icon={Route} />
        <Stat label="Travellers covered" value={t.travellers} icon={Users} tone="violet" />
        <Stat label="Average length" value={`${t.avgDays} days`} icon={Route} tone="ochre" />
        <Stat label="Drafted with AI" value={t.ai} icon={Sparkles} tone="ink" />
      </div>
      {popular.length > 0 && (
        <Panel title="Most-planned destinations" className="mb-5">
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <span key={p.place} className="rounded-full bg-sand-100 px-3 py-1.5 text-sm">
                {PLACE_BY_ID[p.place]?.name ?? p.place} <strong className="ml-1">{p.n}</strong>
              </span>
            ))}
          </div>
        </Panel>
      )}
      <SearchBox action="/admin/trips" value={q} placeholder="Search trip title or traveller email" />
      <DataTable
        rows={rows}
        rowKey={(r) => r.t.id}
        empty="No trips saved yet. Trips appear here once signed-in travellers plan them."
        cols={[
          {
            label: "Trip",
            cell: ({ t }) => (
              <Link href={`/admin/trips/${t.id}`} className="font-medium text-savanna-700 hover:underline">
                {t.title}
              </Link>
            ),
          },
          { label: "Traveller", cell: (r) => <span className="text-ink-soft">{r.email ?? "—"}</span> },
          { label: "Route", cell: ({ t }) => <span className="text-xs text-ink-soft">{t.stops.map((x) => PLACE_BY_ID[x]?.name ?? x).join(" → ")}</span>, hideSm: true },
          { label: "Days", cell: ({ t }) => `${t.days} · ${t.travelers} ppl` },
          { label: "Planned cost", cell: ({ t }) => kes(t.totalKes) },
          { label: "Updated", cell: ({ t }) => when(t.updatedAt), hideSm: true },
          {
            label: "",
            cell: ({ t }) => (
              <form action={deleteTrip}>
                <input type="hidden" name="id" value={t.id} />
                <Submit small tone="danger" confirm="Delete this trip from the traveller's account?">
                  Delete
                </Submit>
              </form>
            ),
          },
        ]}
      />
    </>
  );
}
