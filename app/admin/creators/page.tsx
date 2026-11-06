import { asc, desc, eq, inArray } from "drizzle-orm";
import { publishSubmissionToVr, reviewSubmission, setLiveStatus } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, Field, FilterTabs, PageHeader, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Creators & live walks" };

const yt = (url: string) => url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1];

export default async function CreatorsAdmin({ searchParams }: { searchParams: { tab?: string; status?: string } }) {
  const tab = searchParams.tab === "live" ? "live" : "videos";
  const db = await getDb();
  const settings = await getSettings();
  const dests = await db.select({ slug: s.vrDestinations.slug, name: s.vrDestinations.name }).from(s.vrDestinations).orderBy(asc(s.vrDestinations.sort));

  return (
    <>
      <PageHeader title="Creators & live walks" text="Review videos creators want to sell to Tembea, buy the good ones, publish them as 360° scenes, and approve volunteer live walks." />
      <FilterTabs
        base="/admin/creators"
        param="tab"
        value={tab === "live" ? "live" : ""}
        options={[
          { value: "", label: "Video submissions" },
          { value: "live", label: "Live walks" },
        ]}
      />
      {tab === "videos" ? <Videos status={searchParams.status} dests={dests} tokens={settings.rewardTokensPerApprovedVideo} /> : <Live tokens={settings.rewardTokensPerLiveWalk} />}
    </>
  );
}

async function Videos({ status, dests, tokens }: { status?: string; dests: { slug: string; name: string }[]; tokens: number }) {
  const db = await getDb();
  const st = status || "open";
  const where = st === "open" ? inArray(s.videoSubmissions.status, ["submitted", "in_review"]) : st === "all" ? undefined : eq(s.videoSubmissions.status, st as "approved");
  const rows = await db
    .select({ v: s.videoSubmissions, name: s.users.name, email: s.users.email })
    .from(s.videoSubmissions)
    .leftJoin(s.users, eq(s.users.id, s.videoSubmissions.userId))
    .where(where)
    .orderBy(desc(s.videoSubmissions.createdAt))
    .limit(100);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {[
          ["open", "To review"],
          ["approved", "Approved"],
          ["purchased", "Purchased"],
          ["rejected", "Rejected"],
          ["all", "All"],
        ].map(([v, l]) => (
          <a key={v} href={`/admin/creators?status=${v}`} className={`rounded-full px-3 py-1.5 ${st === v ? "bg-savanna-500 text-white" : "bg-white text-ink-soft shadow-card"}`}>
            {l}
          </a>
        ))}
      </div>
      {!rows.length && <Empty text="No video submissions here." />}
      <ul className="space-y-4">
        {rows.map(({ v, name, email }) => {
          const id = yt(v.videoUrl);
          return (
            <li key={v.id} className="grid gap-4 rounded-3xl bg-white p-4 shadow-card lg:grid-cols-[360px_1fr]">
              <div className="overflow-hidden rounded-2xl bg-ink">
                {id ? (
                  <iframe title={v.title} src={`https://www.youtube-nocookie.com/embed/${id}`} className="aspect-video w-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
                ) : (
                  <video src={v.videoUrl} poster={v.thumbnailUrl ?? undefined} controls preload="metadata" className="aspect-video w-full" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{v.title}</h3>
                  <StatusBadge status={v.status} />
                  {v.is360 && <StatusBadge status="scheduled" label="360°" />}
                </div>
                <p className="text-sm text-ink-muted">
                  {name || "Creator"} · {email} · {when(v.createdAt)}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{v.description}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {v.mode} · {v.location || v.destination} · {v.resolution || "resolution not given"} · asking {kes(v.askingPrice)}
                  {v.offerAmount ? ` · offered ${kes(v.offerAmount)}` : ""}
                </p>
                {v.reviewerNote && <p className="mt-1 text-xs italic text-ink-muted">Note: {v.reviewerNote}</p>}
                <form action={reviewSubmission} className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,140px),1fr))]">
                  <input type="hidden" name="id" value={v.id} />
                  <Field label="Offer (KES)">
                    <input name="offer" type="number" min={0} defaultValue={v.offerAmount ?? v.askingPrice} className={inputCls} />
                  </Field>
                  <Field label="Reward tokens">
                    <input name="tokens" type="number" min={0} defaultValue={v.rewardTokens || tokens} className={inputCls} />
                  </Field>
                  <Field label="Note to creator" className="col-span-2">
                    <input name="note" defaultValue={v.reviewerNote ?? ""} className={inputCls} placeholder="Feedback on quality, stabilisation, audio…" />
                  </Field>
                  <div className="col-span-full flex flex-wrap gap-1.5">
                    {v.status === "submitted" && (
                      <Submit small tone="outline" name="decision" value="in_review">
                        Mark in review
                      </Submit>
                    )}
                    {v.status !== "purchased" && (
                      <>
                        <Submit small tone="soft" name="decision" value="approve">
                          Approve
                        </Submit>
                        <Submit small name="decision" value="purchase" confirm="Buy this video? A payout to the creator will be created and tokens credited.">
                          Buy video
                        </Submit>
                        <Submit small tone="danger" name="decision" value="reject">
                          Reject
                        </Submit>
                      </>
                    )}
                  </div>
                </form>
                {(v.status === "approved" || v.status === "purchased") && (
                  <form action={publishSubmissionToVr} className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-sand-50 p-3">
                    <input type="hidden" name="id" value={v.id} />
                    <Field label="Publish as a 360° scene in">
                      <select name="destination" defaultValue={dests.some((d) => d.slug === v.destination) ? v.destination : ""} className={inputCls}>
                        <option value="">Choose destination…</option>
                        {dests.map((d) => (
                          <option key={d.slug} value={d.slug}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Submit small tone="dark">
                      Add to virtual pre-visits
                    </Submit>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

async function Live({ tokens }: { tokens: number }) {
  const db = await getDb();
  const rows = await db
    .select({ l: s.liveSessions, name: s.users.name, email: s.users.email })
    .from(s.liveSessions)
    .leftJoin(s.users, eq(s.users.id, s.liveSessions.hostUserId))
    .orderBy(desc(s.liveSessions.scheduledAt))
    .limit(100);
  if (!rows.length) return <Empty text="No live walks proposed yet. Hosts propose them from the Creators page." />;
  return (
    <ul className="space-y-3">
      {rows.map(({ l, name, email }) => (
        <li key={l.id} className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-bold">{l.title}</h3>
            <StatusBadge status={l.status} />
          </div>
          <p className="text-sm text-ink-muted">
            {name} · {email} · {l.destination} · {l.mode} · {when(l.scheduledAt)} · {l.durationMin} min
          </p>
          {l.notes && <p className="mt-1 text-sm text-ink-soft">{l.notes}</p>}
          <form action={setLiveStatus} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={l.id} />
            <Field label="Stream link (YouTube Live, TikTok Live…)" className="min-w-[240px] flex-1">
              <input name="streamUrl" defaultValue={l.streamUrl ?? ""} className={inputCls} placeholder="https://youtube.com/live/…" />
            </Field>
            <Field label="Tokens when ended">
              <input name="tokens" type="number" min={0} defaultValue={l.rewardTokens || tokens} className={inputCls} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {l.status === "proposed" && (
                <Submit small name="status" value="scheduled">
                  Approve & schedule
                </Submit>
              )}
              {(l.status === "scheduled" || l.status === "proposed") && (
                <Submit small tone="dark" name="status" value="live">
                  Mark live now
                </Submit>
              )}
              {l.status !== "ended" && l.status !== "cancelled" && (
                <>
                  <Submit small tone="soft" name="status" value="ended">
                    Ended · reward host
                  </Submit>
                  <Submit small tone="danger" name="status" value="cancelled">
                    Cancel
                  </Submit>
                </>
              )}
            </div>
          </form>
        </li>
      ))}
    </ul>
  );
}
