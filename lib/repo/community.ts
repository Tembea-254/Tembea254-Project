import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Media } from "../db/schema";
import { getDb, schema as s } from "../db";

export type Author = { id: string; name: string; image: string | null; handle: string | null; team: boolean; seller: string | null };
export type TaggedListing = { id: string; title: string; price: number; image: string | null; kind: string; unit: string; store: string };
export type FeedPost = {
  id: string;
  author: Author;
  mine: boolean;
  kind: string;
  text: string;
  tags: string[];
  placeId: string | null;
  media: Media[];
  rating: number | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  liked: boolean;
  saved: boolean;
  following: boolean;
  product: TaggedListing | null;
  createdAt: number;
};

/** #hashtags in a post, lower-cased, without the # */
export const parseTags = (text: string) =>
  Array.from(new Set((text.match(/#[\p{L}\p{N}_]{2,40}/gu) ?? []).map((t) => t.slice(1).toLowerCase()))).slice(0, 12);

export async function hydratePosts(rows: (typeof s.posts.$inferSelect)[], meId?: string | null): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const productIds = rows.map((r) => r.productId).filter(Boolean) as string[];
  const [authors, sellers, likes, saves, follows, products] = await Promise.all([
    db.select({ id: s.users.id, name: s.users.name, image: s.users.image, handle: s.users.handle }).from(s.users).where(inArray(s.users.id, userIds)),
    db.select({ userId: s.vendors.userId, slug: s.vendors.slug }).from(s.vendors).where(and(inArray(s.vendors.userId, userIds), eq(s.vendors.status, "verified"))),
    meId ? db.select({ id: s.postLikes.postId }).from(s.postLikes).where(and(eq(s.postLikes.userId, meId), inArray(s.postLikes.postId, ids))) : Promise.resolve([]),
    meId ? db.select({ id: s.postSaves.postId }).from(s.postSaves).where(and(eq(s.postSaves.userId, meId), inArray(s.postSaves.postId, ids))) : Promise.resolve([]),
    meId ? db.select({ id: s.follows.followingId }).from(s.follows).where(and(eq(s.follows.followerId, meId), inArray(s.follows.followingId, userIds))) : Promise.resolve([]),
    productIds.length
      ? db
          .select({ id: s.products.id, title: s.products.title, price: s.products.price, images: s.products.images, kind: s.products.kind, unit: s.products.unit, store: s.vendors.storeName })
          .from(s.products)
          .innerJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
          .where(and(inArray(s.products.id, productIds), eq(s.products.status, "active")))
      : Promise.resolve([]),
  ]);
  const liked = new Set(likes.map((l) => l.id));
  const saved = new Set(saves.map((l) => l.id));
  const fol = new Set(follows.map((l) => l.id));
  return rows.map((p) => {
    const a = authors.find((x) => x.id === p.userId);
    const pr = products.find((x) => x.id === p.productId);
    return {
      id: p.id,
      author: { id: p.userId, name: a?.name || "Traveller", image: a?.image ?? null, handle: a?.handle ?? null, team: p.team, seller: sellers.find((x) => x.userId === p.userId)?.slug ?? null },
      mine: !!meId && p.userId === meId,
      kind: p.kind,
      text: p.text,
      tags: p.tags,
      placeId: p.placeId,
      media: p.media,
      rating: p.rating,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      shareCount: p.shareCount,
      viewCount: p.viewCount,
      liked: liked.has(p.id),
      saved: saved.has(p.id),
      following: fol.has(p.userId),
      product: pr ? { id: pr.id, title: pr.title, price: pr.price, image: pr.images[0] ?? null, kind: pr.kind, unit: pr.unit, store: pr.store.replace(" (demo)", "") } : null,
      createdAt: p.createdAt.getTime(),
    };
  });
}

/** Trending hashtags in the last 30 days. */
export async function trendingTags(limit = 12) {
  const db = await getDb();
  const rows = await db.execute<{ tag: string; n: number }>(
    sql`select t as tag, count(*)::int as n from ${s.posts}, unnest(${s.posts.tags}) as t where ${s.posts.status} = 'visible' and ${s.posts.createdAt} > now() - interval '30 days' group by t order by n desc limit ${limit}`,
  );
  return (Array.isArray(rows) ? rows : (rows as unknown as { rows: { tag: string; n: number }[] }).rows) as { tag: string; n: number }[];
}

/** People worth following: sellers, creators and active posters the viewer doesn't follow yet. */
export async function suggestedPeople(meId: string | null, limit = 6) {
  const db = await getDb();
  const rows = await db
    .select({ id: s.users.id, name: s.users.name, image: s.users.image, handle: s.users.handle, bio: s.users.bio, posts: sql<number>`(select count(*)::int from ${s.posts} p where p.user_id = ${s.users.id} and p.status = 'visible')` })
    .from(s.users)
    .where(and(sql`${s.users.handle} is not null`, meId ? sql`${s.users.id} <> ${meId} and ${s.users.id} not in (select following_id from ${s.follows} where follower_id = ${meId})` : sql`true`))
    .orderBy(desc(sql`(select count(*) from ${s.posts} p where p.user_id = ${s.users.id})`), desc(s.users.createdAt))
    .limit(limit);
  return rows;
}

export async function activeStories(meId: string | null) {
  const db = await getDb();
  const rows = await db
    .select({ st: s.stories, name: s.users.name, image: s.users.image, handle: s.users.handle })
    .from(s.stories)
    .innerJoin(s.users, eq(s.users.id, s.stories.userId))
    .where(gt(s.stories.expiresAt, new Date()))
    .orderBy(desc(s.stories.createdAt))
    .limit(200);
  const following = meId ? new Set((await db.select({ id: s.follows.followingId }).from(s.follows).where(eq(s.follows.followerId, meId))).map((r) => r.id)) : new Set<string>();
  const groups = new Map<string, { userId: string; name: string; image: string | null; handle: string | null; mine: boolean; following: boolean; items: { id: string; media: Media; caption: string; placeId: string | null; productId: string | null; createdAt: number }[] }>();
  for (const r of rows) {
    const g = groups.get(r.st.userId) ?? { userId: r.st.userId, name: r.name, image: r.image, handle: r.handle, mine: r.st.userId === meId, following: following.has(r.st.userId), items: [] };
    g.items.push({ id: r.st.id, media: r.st.media, caption: r.st.caption, placeId: r.st.placeId, productId: r.st.productId, createdAt: r.st.createdAt.getTime() });
    groups.set(r.st.userId, g);
  }
  return Array.from(groups.values())
    .map((g) => ({ ...g, items: g.items.sort((a, b) => a.createdAt - b.createdAt) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || Number(b.following) - Number(a.following));
}
