import { desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { decideReview } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, FilterTabs, PageHeader, StatusBadge, inputCls, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin({ searchParams }: { searchParams: { status?: string } }) {
  const status = (searchParams.status || "pending") as "pending" | "approved" | "rejected";
  const db = await getDb();
  const settings = await getSettings();
  const rows = await db.select({ r: s.reviews, email: s.users.email }).from(s.reviews).leftJoin(s.users, eq(s.users.id, s.reviews.userId)).where(eq(s.reviews.status, status)).orderBy(desc(s.reviews.createdAt)).limit(100);
  return (
    <>
      <PageHeader title="Reviews" text={`Approved reviews appear in "What clients say" on the homepage. Approving rewards the traveller with tokens (default ${settings.rewardTokensPerReview}).`} />
      <FilterTabs
        base="/admin/reviews"
        value={status}
        options={[
          { value: "pending", label: "Waiting" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ]}
      />
      {!rows.length && <Empty text="Nothing here." />}
      <ul className="space-y-3">
        {rows.map(({ r, email }) => (
          <li key={r.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex text-ochre-400" aria-label={`${r.rating} of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-25"}`} />
                ))}
              </span>
              <StatusBadge status={r.status} />
              {r.rewarded && <StatusBadge status="paid" label="Rewarded" />}
            </div>
            <p className="mt-2 text-sm">{r.text}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {r.name}
              {r.from ? ` from ${r.from}` : ""} · {email ?? "guest"} · {r.trip} · {when(r.createdAt)}
            </p>
            {r.status === "pending" && (
              <form action={decideReview} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <label className="text-xs text-ink-muted">
                  Reward tokens
                  <input name="tokens" type="number" min={0} defaultValue={settings.rewardTokensPerReview} className={`${inputCls} mt-0.5 h-9 w-28`} />
                </label>
                <Submit small name="decision" value="approve">
                  Approve
                </Submit>
                <Submit small tone="danger" name="decision" value="reject">
                  Reject
                </Submit>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
