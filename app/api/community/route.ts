import { and, desc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import type { Media } from "@/lib/db/schema";
import { notify } from "@/lib/notify";
import { hydratePosts, parseTags } from "@/lib/repo/community";
import { HttpError, currentUser, requireUser } from "@/lib/session";
import { ensureHandle } from "@/lib/users";

export const dynamic = "force-dynamic";

const PAGE = 12;

/**
 * Feed. ?filter=all|following|reels|videos|photos|questions|reviews|saved|mine|tag:<t>|place:<id>|user:<id>|post:<id> &cursor=<iso date>
 */
export const GET = handler(async (req: Request) => {
  const me = await currentUser();
  const db = await getDb();
  const q = new URL(req.url).searchParams;
  const filter = q.get("filter") || "all";
  const cursor = q.get("cursor");
  const P = schema.posts;
  const empty = json({ posts: [], next: null });

  const where: SQL[] = [eq(P.status, "visible")];
  if (cursor) where.push(lt(P.createdAt, new Date(cursor)));
  if (filter === "videos" || filter === "reels") where.push(sql`${P.media} @> '[{"type":"video"}]'::jsonb`);
  if (filter === "photos") where.push(sql`${P.media} @> '[{"type":"image"}]'::jsonb`);
  if (filter === "questions") where.push(eq(P.kind, "question"));
  if (filter === "reviews") where.push(eq(P.kind, "review"));
  if (filter.startsWith("place:")) where.push(eq(P.placeId, filter.slice(6)));
  if (filter.startsWith("tag:")) where.push(sql`${filter.slice(4).toLowerCase()} = any(${P.tags})`);
  if (filter.startsWith("user:")) where.push(eq(P.userId, filter.slice(5)));
  if (filter.startsWith("post:")) where.push(eq(P.id, filter.slice(5)));
  if (filter === "mine") {
    if (!me) return empty;
    where.push(eq(P.userId, me.id));
  }
  if (filter === "following") {
    if (!me) return empty;
    where.push(sql`${P.userId} in (select following_id from ${schema.follows} where follower_id = ${me.id})`);
  }
  if (filter === "saved") {
    if (!me) return empty;
    const saved = await db.select({ id: schema.postSaves.postId }).from(schema.postSaves).where(eq(schema.postSaves.userId, me.id));
    if (!saved.length) return empty;
    where.push(inArray(P.id, saved.map((s) => s.id)));
  }

  const rows = await db
    .select()
    .from(P)
    .where(and(...where))
    .orderBy(desc(P.createdAt))
    .limit(PAGE + 1);
  const posts = await hydratePosts(rows.slice(0, PAGE), me?.id);
  const next = rows.length > PAGE ? rows[PAGE - 1].createdAt.toISOString() : null;
  return json({ posts, next });
});

function cleanMedia(input: unknown): Media[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 10)
    .filter((m): m is Media => !!m && typeof m === "object" && (m.type === "image" || m.type === "video") && typeof m.url === "string" && /^(https?:\/\/|\/uploads\/)/.test(m.url))
    .map((m) => ({ type: m.type, url: m.url.slice(0, 600), poster: typeof m.poster === "string" ? m.poster.slice(0, 600) : undefined }));
}

/** Actions: post, like, save, comment, delete, report, share, view, follow, story, profile. */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const b = await body(req);
  const db = await getDb();
  const P = schema.posts;

  if (b.action === "post") {
    const text = String(b.text || "").trim().slice(0, 2200);
    const media = cleanMedia(b.media);
    if (!text && !media.length) throw new HttpError(400, "Write something or add a photo or video.");
    const kind = ["tip", "question", "review"].includes(String(b.kind)) ? String(b.kind) : "update";
    const rating = kind === "review" ? Math.min(5, Math.max(1, Math.round(Number(b.rating) || 5))) : null;
    const id = newId("p_");
    const placeId = typeof b.placeId === "string" && b.placeId ? b.placeId.slice(0, 40) : null;
    let productId: string | null = null;
    if (typeof b.productId === "string" && b.productId) {
      const pr = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.id, b.productId), eq(schema.products.status, "active")));
      productId = pr[0]?.id ?? null;
    }
    await ensureHandle(me);
    await db.insert(P).values({ id, userId: me.id, kind, text, media, placeId, rating, productId, tags: parseTags(text) });
    // a review in the community also goes to the review queue — approved reviews earn tokens
    if (kind === "review" && text.length >= 20) {
      await db.insert(schema.reviews).values({ id: `r_${id}`, userId: me.id, name: (me.name || "Traveller").split(" ")[0], rating: rating!, text: text.slice(0, 600), trip: placeId ?? "", placeImage: media.find((m) => m.type === "image")?.url ?? "" });
    }
    return json({ ok: true, id });
  }

  if (b.action === "story") {
    const media = cleanMedia([b.media])[0];
    if (!media) throw new HttpError(400, "Add a photo or a short video.");
    await ensureHandle(me);
    const id = newId("st_");
    await db.insert(schema.stories).values({ id, userId: me.id, media, caption: String(b.caption || "").slice(0, 200), placeId: typeof b.placeId === "string" ? b.placeId.slice(0, 40) || null : null, productId: typeof b.productId === "string" ? b.productId || null : null, expiresAt: new Date(Date.now() + 24 * 3600_000) });
    return json({ ok: true, id });
  }

  if (b.action === "follow") {
    const target = String(b.userId || "");
    if (!target || target === me.id) throw new HttpError(400, "You can't follow yourself.");
    const F = schema.follows;
    const exists = (await db.select().from(F).where(and(eq(F.followerId, me.id), eq(F.followingId, target)))).length > 0;
    if (exists) await db.delete(F).where(and(eq(F.followerId, me.id), eq(F.followingId, target)));
    else {
      await db.insert(F).values({ followerId: me.id, followingId: target }).onConflictDoNothing();
      const h = await ensureHandle(me);
      await notify(target, "follow", `${me.name || "Someone"} started following you`, `/community/u/${h}`, me.id);
    }
    const n = (await db.select({ n: sql<number>`count(*)::int` }).from(F).where(eq(F.followingId, target)))[0].n;
    return json({ following: !exists, followers: n });
  }

  if (b.action === "profile") {
    const handle = String(b.handle || "")
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 24);
    if (handle.length < 3) throw new HttpError(400, "Pick a username of at least 3 letters or numbers.");
    const taken = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle));
    if (taken[0] && taken[0].id !== me.id) throw new HttpError(409, "That username is taken.");
    await db.update(schema.users).set({ handle, bio: String(b.bio || "").slice(0, 160), ...(typeof b.name === "string" && b.name.trim() ? { name: b.name.trim().slice(0, 60) } : {}) }).where(eq(schema.users.id, me.id));
    return json({ ok: true, handle });
  }

  const postId = String(b.id || "");
  const post = (await db.select().from(P).where(eq(P.id, postId)))[0];
  if (!post || post.status === "removed") throw new HttpError(404, "Post not found.");

  if (b.action === "like" || b.action === "save") {
    const T = b.action === "like" ? schema.postLikes : schema.postSaves;
    const exists = (await db.select().from(T).where(and(eq(T.postId, postId), eq(T.userId, me.id)))).length > 0;
    if (exists && b.only !== "on") await db.delete(T).where(and(eq(T.postId, postId), eq(T.userId, me.id)));
    else if (!exists) await db.insert(T).values({ postId, userId: me.id }).onConflictDoNothing();
    const nowOn = exists ? b.only === "on" : true;
    if (b.action === "like") {
      const n = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.postLikes).where(eq(schema.postLikes.postId, postId)))[0].n;
      await db.update(P).set({ likeCount: n }).where(eq(P.id, postId));
      if (nowOn && !exists) await notify(post.userId, "like", `${me.name || "Someone"} liked your post`, `/community/p/${postId}`, me.id);
      return json({ liked: nowOn, likeCount: n });
    }
    return json({ saved: nowOn });
  }

  if (b.action === "comment") {
    const text = String(b.text || "").trim().slice(0, 500);
    if (!text) throw new HttpError(400, "Comment is empty.");
    await ensureHandle(me);
    await db.insert(schema.comments).values({ id: newId("c_"), postId, userId: me.id, text });
    const n = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.comments).where(and(eq(schema.comments.postId, postId), eq(schema.comments.status, "visible"))))[0].n;
    await db.update(P).set({ commentCount: n }).where(eq(P.id, postId));
    await notify(post.userId, "comment", `${me.name || "Someone"} commented: “${text.slice(0, 60)}”`, `/community/p/${postId}`, me.id);
    return json({ ok: true, commentCount: n });
  }

  if (b.action === "share") {
    await db.update(P).set({ shareCount: post.shareCount + 1 }).where(eq(P.id, postId));
    return json({ ok: true });
  }

  if (b.action === "view") {
    await db.update(P).set({ viewCount: post.viewCount + 1 }).where(eq(P.id, postId));
    return json({ ok: true });
  }

  if (b.action === "report") {
    const reason = String(b.reason || "Inappropriate").slice(0, 200);
    await db.insert(schema.reports).values({ id: newId("rep_"), targetType: "post", targetId: postId, userId: me.id, reason });
    return json({ ok: true });
  }

  if (b.action === "delete") {
    if (post.userId !== me.id && me.role !== "admin") throw new HttpError(403, "You can only delete your own posts.");
    await db.update(P).set({ status: "removed" }).where(eq(P.id, postId));
    return json({ deleted: true });
  }

  throw new HttpError(400, "Unknown action.");
});
