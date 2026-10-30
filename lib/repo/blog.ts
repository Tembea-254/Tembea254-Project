import { desc, eq } from "drizzle-orm";
import { POSTS, type BlogPost } from "../data/blog";
import { getDb, schema } from "../db";

type Row = typeof schema.blogPosts.$inferSelect;
const toPost = (r: Row): BlogPost => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  category: r.category as BlogPost["category"],
  cover: r.cover,
  date: r.publishedAt || r.updatedAt.toISOString().slice(0, 10),
  readMins: r.readMins,
  author: r.author,
  sections: r.sections as BlogPost["sections"],
  related: (r.related as BlogPost["related"]) ?? undefined,
});

/** Published blog posts, newest first (admins write and edit them in /admin/blog). */
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const db = await getDb();
    const rows = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.status, "published")).orderBy(desc(schema.blogPosts.publishedAt));
    return rows.length ? rows.map(toPost) : POSTS;
  } catch (e) {
    console.error("[blog] falling back to built-in posts", e);
    return POSTS;
  }
}

export async function getBlogPost(slug: string) {
  return (await getBlogPosts()).find((p) => p.slug === slug);
}
