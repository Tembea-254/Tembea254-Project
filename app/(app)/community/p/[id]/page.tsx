import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { PostGrid } from "@/components/community/hub";
import { SinglePost } from "@/components/community/single-post";
import { getDb, schema as s } from "@/lib/db";
import { hydratePosts } from "@/lib/repo/community";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const db = await getDb();
  const row = (await db.select().from(s.posts).where(and(eq(s.posts.id, id), eq(s.posts.status, "visible"))))[0];
  return row;
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const row = await load(params.id);
  return { title: row ? row.text.slice(0, 60) || "Post" : "Post" };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const row = await load(params.id);
  if (!row) notFound();
  const me = await currentUser();
  const [post] = await hydratePosts([row], me?.id);
  return (
    <div className="container-page max-w-[620px] py-5 sm:py-8">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Community
      </Link>
      <SinglePost post={post} />
      <h2 className="mb-3 mt-8 font-display text-lg font-bold">More from {post.author.name.replace(" (demo)", "")}</h2>
      <PostGrid filter={`user:${post.author.id}`} />
    </div>
  );
}
