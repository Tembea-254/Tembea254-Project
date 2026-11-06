import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { saveBlogPost } from "../../actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Field, PageHeader, Panel, inputCls, textareaCls } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

type Section = { heading?: string; paragraphs: string[]; tips?: string[] };

function toBody(sections: Section[]) {
  return sections
    .map((sec) => [sec.heading ? `## ${sec.heading}` : "", ...sec.paragraphs, ...(sec.tips ?? []).map((t) => `- ${t}`)].filter(Boolean).join("\n\n"))
    .join("\n\n");
}

export default async function BlogEditor({ searchParams }: { searchParams: { slug?: string } }) {
  const db = await getDb();
  const post = searchParams.slug ? (await db.select().from(s.blogPosts).where(eq(s.blogPosts.slug, searchParams.slug)))[0] : undefined;
  const related = post?.related as { label: string; href: string } | null | undefined;
  return (
    <>
      <Link href="/admin/blog" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>
      <PageHeader title={post ? "Edit post" : "New post"} />
      <form action={saveBlogPost} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <input type="hidden" name="original" value={post?.slug ?? ""} />
        <Panel>
          <div className="space-y-3">
            <Field label="Title">
              <input name="title" required defaultValue={post?.title} className={`${inputCls} text-base font-semibold`} />
            </Field>
            <Field label="Short summary" hint="Shown on the blog list and in link previews.">
              <textarea name="excerpt" rows={2} defaultValue={post?.excerpt} className={textareaCls} />
            </Field>
            <Field label="Article" hint='Start a section with "## Heading". Leave a blank line between paragraphs. Lines starting with "- " become tips.'>
              <textarea name="body" rows={22} defaultValue={post ? toBody(post.sections as Section[]) : ""} className={`${textareaCls} font-mono text-[13px] leading-relaxed`} />
            </Field>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Publish">
            <div className="space-y-3">
              <Field label="Status">
                <select name="status" defaultValue={post?.status ?? "published"} className={inputCls}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
              <Field label="Date">
                <input type="date" name="publishedAt" defaultValue={post?.publishedAt ?? new Date().toISOString().slice(0, 10)} className={inputCls} />
              </Field>
              <Submit className="w-full">Save post</Submit>
            </div>
          </Panel>
          <Panel title="Details">
            <div className="space-y-3">
              <Field label="Web address (slug)" hint="Leave empty to make one from the title.">
                <input name="slug" defaultValue={post?.slug} className={inputCls} />
              </Field>
              <Field label="Category">
                <select name="category" defaultValue={post?.category ?? "Guides"} className={inputCls}>
                  {["Safari", "Coast", "City", "Guides", "Culture"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Author">
                <input name="author" defaultValue={post?.author ?? "Tembea254 Team"} className={inputCls} />
              </Field>
              <Field label="Cover image" hint="Upload, or paste a URL / Unsplash photo id.">
                <input name="cover" defaultValue={post?.cover} className={inputCls} />
              </Field>
              <UploadField name="coverUpload" label="Upload cover" />
              <Field label="Call-to-action label">
                <input name="relatedLabel" defaultValue={related?.label} placeholder="Walk the Mara in 360°" className={inputCls} />
              </Field>
              <Field label="Call-to-action link">
                <input name="relatedHref" defaultValue={related?.href} placeholder="/vr/maasai-mara" className={inputCls} />
              </Field>
            </div>
          </Panel>
        </div>
      </form>
    </>
  );
}
