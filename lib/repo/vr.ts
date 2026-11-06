import { asc } from "drizzle-orm";
import { VR_DESTINATIONS, type VRDestination, type VRScene } from "../data/vr";
import { getDb, schema } from "../db";

/** Virtual pre-visit destinations from the database (admins manage them); falls back to the built-in set. */
export async function getVrDestinations(opts: { all?: boolean } = {}): Promise<VRDestination[]> {
  try {
    const db = await getDb();
    const [dests, scenes] = await Promise.all([
      db.select().from(schema.vrDestinations).orderBy(asc(schema.vrDestinations.sort)),
      db.select().from(schema.vrScenes).orderBy(asc(schema.vrScenes.sort)),
    ]);
    if (!dests.length) return VR_DESTINATIONS;
    return dests
      .filter((d) => opts.all || d.published)
      .map((d) => ({
        ...(d.data as Omit<VRDestination, "slug" | "name" | "region" | "type" | "scenes">),
        slug: d.slug,
        name: d.name,
        region: d.region,
        type: d.type as VRDestination["type"],
        scenes: scenes
          .filter((s) => s.destinationSlug === d.slug && (opts.all || s.published))
          .map(
            (s): VRScene => ({
              id: s.id,
              mode: s.mode as VRScene["mode"],
              title: s.title,
              spot: s.spot,
              time: s.time as VRScene["time"],
              source: s.source as VRScene["source"],
              minutes: s.minutes,
              yaw: s.yaw ?? undefined,
              premium: s.premium,
              credit: s.credit,
            }),
          ),
      }))
      .filter((d) => opts.all || d.scenes.length > 0);
  } catch (e) {
    console.error("[vr] falling back to built-in destinations", e);
    return VR_DESTINATIONS;
  }
}

export async function getVrDestination(slug: string) {
  return (await getVrDestinations()).find((d) => d.slug === slug);
}
