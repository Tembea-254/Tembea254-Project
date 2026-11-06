import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { setDestinationPublished } from "../actions";
import { Submit } from "@/components/admin/client";
import { PageHeader, StatusBadge, mediaSrc } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Virtual pre-visits" };

export default async function VrAdmin() {
  const db = await getDb();
  const dests = await db
    .select({
      d: s.vrDestinations,
      scenes: sql<number>`(select count(*)::int from ${s.vrScenes} x where x.destination_slug = ${s.vrDestinations.slug})`,
      live: sql<number>`(select count(*)::int from ${s.vrScenes} x where x.destination_slug = ${s.vrDestinations.slug} and x.published)`,
      modes: sql<string[]>`(select coalesce(array_agg(distinct x.mode), '{}') from ${s.vrScenes} x where x.destination_slug = ${s.vrDestinations.slug} and x.published)`,
    })
    .from(s.vrDestinations)
    .orderBy(asc(s.vrDestinations.sort));
  return (
    <>
      <PageHeader title="Virtual pre-visits" text="Destinations and their 360° scenes. Hide a destination, fix a scene's Fly/Walk/Drive/Look mode, or add new footage (YouTube 360° or your own uploads)." />
      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr))]">
        {dests.map(({ d, scenes, live, modes }) => {
          const data = d.data as { cover?: string; tagline?: string };
          return (
            <li key={d.slug} className="overflow-hidden rounded-3xl bg-white shadow-card">
              <Link href={`/admin/vr/${d.slug}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(data.cover, 600, 300)} alt="" className="h-32 w-full bg-sand-100 object-cover" />
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/vr/${d.slug}`} className="font-display font-bold hover:underline">
                      {d.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">{d.region} · {d.type}</p>
                  </div>
                  <StatusBadge status={d.published ? "published" : "hidden"} />
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {live} of {scenes} scenes live · {modes.join(", ") || "no modes"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/admin/vr/${d.slug}`} className="inline-flex h-8 items-center rounded-full bg-ink px-3 font-display text-xs font-semibold text-white">
                    Manage scenes
                  </Link>
                  <form action={setDestinationPublished}>
                    <input type="hidden" name="slug" value={d.slug} />
                    <Submit small tone="outline" name="published" value={d.published ? "false" : "true"}>
                      {d.published ? "Hide" : "Publish"}
                    </Submit>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
