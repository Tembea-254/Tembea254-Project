import { and, eq, ilike, or, sql } from "drizzle-orm";
import { handler, json } from "@/lib/api";
import { PLACES } from "@/lib/data/places";
import { getDb, schema as s } from "@/lib/db";
import { listProducts } from "@/lib/repo/shop";

export const dynamic = "force-dynamic";

/** Search people, hashtags, places and marketplace listings in one go. */
export const GET = handler(async (req: Request) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().replace(/^[#@]/, "").slice(0, 40);
  if (q.length < 2) return json({ people: [], tags: [], places: [], listings: [] });
  const db = await getDb();
  const like = `%${q}%`;
  const [people, tagRows, listings] = await Promise.all([
    db
      .select({ id: s.users.id, name: s.users.name, image: s.users.image, handle: s.users.handle, bio: s.users.bio })
      .from(s.users)
      .where(and(sql`${s.users.handle} is not null`, or(ilike(s.users.name, like), ilike(s.users.handle, like))))
      .limit(8),
    db.execute<{ tag: string; n: number }>(sql`select t as tag, count(*)::int as n from ${s.posts}, unnest(${s.posts.tags}) t where ${s.posts.status} = 'visible' and t ilike ${like} group by t order by n desc limit 8`),
    listProducts({ q, limit: 6 }),
  ]);
  const tags = (Array.isArray(tagRows) ? tagRows : (tagRows as unknown as { rows: { tag: string; n: number }[] }).rows) as { tag: string; n: number }[];
  const n = q.toLowerCase();
  const places = PLACES.filter((p) => p.name.toLowerCase().includes(n) || p.aliases.some((a) => a.toLowerCase().includes(n)))
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name, region: p.region, image: p.image }));
  return json({ people, tags, places, listings });
});
