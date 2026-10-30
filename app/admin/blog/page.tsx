import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { deleteBlogPost } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, PageHeader, StatusBadge, day } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Blog" };

export default async function BlogAdmin() {
  const db = await getDb();
  const rows = await db.select().from(s.blogPosts).orderBy(desc(s.blogPosts.publishedAt));
  return (
    <>
      <PageHeader
        title="Blog & content"
        text="Write, edit and publish travel guides. Published posts appear on /blog straight away."
        actions={
          <Link href="/admin/blog/edit" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> New post
          </Link>
        }
      />
      <DataTable
        rows={rows}
        rowKey={(r) => r.slug}
        cols={[
          {
            label: "Post",
            cell: (p) => (
              <Link href={`/admin/blog/edit?slug=${p.slug}`} className="font-medium text-savanna-700 hover:underline">
                {p.title}
              </Link>
            ),
          },
          { label: "Category", cell: (p) => p.category },
          { label: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          { label: "Date", cell: (p) => day(p.publishedAt) },
          {
            label: "",
            cell: (p) => (
              <div className="flex gap-1.5">
                <Link href={`/blog/${p.slug}`} target="_blank" className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">
                  View
                </Link>
                <form action={deleteBlogPost}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <Submit small tone="danger" confirm={`Delete "${p.title}"?`}>
                    Delete
                  </Submit>
                </form>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
