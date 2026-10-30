import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { ProfileView } from "@/components/community/profile-view";
import { getDb, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ensureHandle } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { handle: string } }) {
  return { title: `@${params.handle}` };
}

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const db = await getDb();
  const me = await currentUser();
  let handle = decodeURIComponent(params.handle).toLowerCase();
  // "/community/u/me" → your own profile (creates your @handle the first time)
  if (handle === "me" && me) handle = await ensureHandle(me);
  const u = (await db.select().from(s.users).where(eq(s.users.handle, handle)))[0];
  if (!u) notFound();
  const [counts, store, following] = await Promise.all([
    db
      .select({
        posts: sql<number>`(select count(*)::int from ${s.posts} p where p.user_id = ${u.id} and p.status = 'visible')`,
        followers: sql<number>`(select count(*)::int from ${s.follows} f where f.following_id = ${u.id})`,
        following: sql<number>`(select count(*)::int from ${s.follows} f where f.follower_id = ${u.id})`,
        likes: sql<number>`(select coalesce(sum(like_count),0)::int from ${s.posts} p where p.user_id = ${u.id} and p.status = 'visible')`,
      })
      .from(s.users)
      .where(eq(s.users.id, u.id)),
    db.select({ slug: s.vendors.slug, storeName: s.vendors.storeName, sellerType: s.vendors.sellerType, location: s.vendors.location, ratingAvg: s.vendors.ratingAvg }).from(s.vendors).where(and(eq(s.vendors.userId, u.id), eq(s.vendors.status, "verified"))),
    me ? db.select().from(s.follows).where(and(eq(s.follows.followerId, me.id), eq(s.follows.followingId, u.id))) : Promise.resolve([]),
  ]);
  return (
    <div className="container-page max-w-[935px] py-5 sm:py-8">
      <ProfileView
        user={{ id: u.id, name: u.name || "Traveller", handle: u.handle!, bio: u.bio, image: u.image, team: u.id === "tembea-team", joined: u.createdAt.getTime() }}
        counts={counts[0]}
        store={store[0] ? { ...store[0], storeName: store[0].storeName.replace(" (demo)", "") } : null}
        mine={me?.id === u.id}
        following={following.length > 0}
      />
    </div>
  );
}
