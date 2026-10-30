import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { resolveReport, setCommentStatus, setPostStatus } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, FilterTabs, PageHeader, StatusBadge, mediaSrc, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Community" };

export default async function CommunityAdmin({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = ["reports", "comments"].includes(searchParams.tab || "") ? searchParams.tab! : "posts";
  const db = await getDb();
  return (
    <>
      <PageHeader title="Community" text="Moderate posts, photos, videos and comments. Hidden content disappears from the feed but can be restored." />
      <FilterTabs
        base="/admin/community"
        param="tab"
        value={tab === "posts" ? "" : tab}
        options={[
          { value: "", label: "Posts" },
          { value: "reports", label: "Reports" },
          { value: "comments", label: "Comments" },
        ]}
      />
      {tab === "posts" && <Posts />}
      {tab === "reports" && <Reports />}
      {tab === "comments" && <Comments db={db} />}
    </>
  );
}

async function Posts() {
  const db = await getDb();
  const rows = await db
    .select({ p: s.posts, name: s.users.name, email: s.users.email, reports: sql<number>`(select count(*)::int from ${s.reports} r where r.target_id = ${s.posts.id} and r.status = 'open')` })
    .from(s.posts)
    .leftJoin(s.users, eq(s.users.id, s.posts.userId))
    .where(sql`${s.posts.status} <> 'removed'`)
    .orderBy(desc(s.posts.createdAt))
    .limit(100);
  if (!rows.length) return <Empty text="No posts yet." />;
  return (
    <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
      {rows.map(({ p, name, email, reports }) => {
        const m = p.media[0];
        return (
          <li key={p.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card">
            {m &&
              (m.type === "video" ? (
                <video src={m.url} poster={m.poster} controls preload="metadata" className="aspect-video w-full bg-ink object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(m.url, 600, 360)} alt="" className="aspect-video w-full bg-sand-100 object-cover" />
              ))}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={p.status} />
                <StatusBadge status="draft" label={p.kind} />
                {p.media.length > 1 && <span className="text-xs text-ink-muted">+{p.media.length - 1} more</span>}
                {reports > 0 && <StatusBadge status="failed" label={`${reports} report${reports > 1 ? "s" : ""}`} />}
              </div>
              <p className="mt-2 line-clamp-4 text-sm text-ink-soft">{p.text || <em className="text-ink-muted">No caption</em>}</p>
              <p className="mt-2 text-xs text-ink-muted">
                {name} · {email} · {when(p.createdAt)} · {p.likeCount} likes · {p.commentCount} comments
              </p>
              <form action={setPostStatus} className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <input type="hidden" name="id" value={p.id} />
                {p.status === "visible" ? (
                  <Submit small tone="outline" name="status" value="hidden">
                    Hide
                  </Submit>
                ) : (
                  <Submit small tone="soft" name="status" value="visible">
                    Restore
                  </Submit>
                )}
                <Submit small tone="danger" name="status" value="removed" confirm="Remove this post permanently from the feed?">
                  Remove
                </Submit>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function Reports() {
  const db = await getDb();
  const rows = await db
    .select({ r: s.reports, by: s.users.email, text: s.posts.text, status: s.posts.status })
    .from(s.reports)
    .leftJoin(s.users, eq(s.users.id, s.reports.userId))
    .leftJoin(s.posts, eq(s.posts.id, s.reports.targetId))
    .where(eq(s.reports.status, "open"))
    .orderBy(desc(s.reports.createdAt))
    .limit(100);
  if (!rows.length) return <Empty text="No open reports." />;
  return (
    <ul className="space-y-3">
      {rows.map(({ r, by, text, status }) => (
        <li key={r.id} className="rounded-3xl bg-white p-4 shadow-card">
          <p className="text-sm">
            <strong>{r.reason}</strong> <span className="text-ink-muted">· reported by {by} · {when(r.createdAt)}</span>
          </p>
          <p className="mt-1 line-clamp-3 rounded-2xl bg-sand-50 p-3 text-sm text-ink-soft">{text ?? "(content no longer exists)"}</p>
          <form action={resolveReport} className="mt-3 flex flex-wrap gap-1.5">
            <input type="hidden" name="id" value={r.id} />
            {status === "visible" && (
              <Submit small tone="danger" name="action" value="hide">
                Hide post & resolve
              </Submit>
            )}
            <Submit small tone="outline" name="action" value="dismiss">
              Dismiss
            </Submit>
          </form>
        </li>
      ))}
    </ul>
  );
}

async function Comments({ db }: { db: Awaited<ReturnType<typeof getDb>> }) {
  const rows = await db
    .select({ c: s.comments, name: s.users.name, post: s.posts.text })
    .from(s.comments)
    .leftJoin(s.users, eq(s.users.id, s.comments.userId))
    .leftJoin(s.posts, eq(s.posts.id, s.comments.postId))
    .where(and(sql`${s.comments.status} <> 'removed'`))
    .orderBy(desc(s.comments.createdAt))
    .limit(150);
  if (!rows.length) return <Empty text="No comments yet." />;
  return (
    <ul className="divide-y divide-ink/[0.06] rounded-3xl bg-white px-4 shadow-card">
      {rows.map(({ c, name, post }) => (
        <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <strong>{name}</strong>: {c.text}
            </p>
            <p className="truncate text-xs text-ink-muted">
              on “{post?.slice(0, 60)}” · {when(c.createdAt)}
            </p>
          </div>
          <form action={setCommentStatus} className="flex gap-1.5">
            <input type="hidden" name="id" value={c.id} />
            <StatusBadge status={c.status} />
            <Submit small tone="outline" name="status" value={c.status === "visible" ? "hidden" : "visible"}>
              {c.status === "visible" ? "Hide" : "Restore"}
            </Submit>
          </form>
        </li>
      ))}
      <li className="py-3 text-xs text-ink-muted">
        Showing the latest 150. <Link href="/community" className="underline">Open the feed</Link>
      </li>
    </ul>
  );
}
