import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Clapperboard, Coins, Film, Radio, Upload, Wallet } from "lucide-react";
import { cancelLive, proposeLive, submitVideo, withdrawSubmission } from "./actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Empty, Field, Panel, Stat, StatusBadge, inputCls, kes, textareaCls, when } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { getVrDestinations } from "@/lib/repo/vr";
import { redirect } from "next/navigation";
import { canCreate, workspaceAccess } from "@/lib/repo/workspaces";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creators" };

const MODES = [
  { id: "fly", label: "From the air (drone, balloon, plane)" },
  { id: "walk", label: "Walking" },
  { id: "drive", label: "Driving (game drive, road, bush)" },
  { id: "water", label: "On water (ocean, lake, river)" },
  { id: "view", label: "Standing still (lookout, 360° spin)" },
];
const SUB_LABEL: Record<string, string> = { submitted: "Waiting for review", in_review: "In review", approved: "Approved — offer made", purchased: "Bought by Tembea", rejected: "Not accepted" };
const TABS = [
  { id: "overview", label: "Overview", icon: Clapperboard },
  { id: "submit", label: "Sell a video", icon: Upload },
  { id: "videos", label: "My videos", icon: Film },
  { id: "live", label: "Host a live walk", icon: Radio },
];

export default async function CreatorsPage({ searchParams }: { searchParams: { tab?: string; ok?: string; error?: string } }) {
  const me = await requireUser();
  if (!canCreate(await workspaceAccess(me))) redirect("/marketplace/join/creator");
  const tab = TABS.some((t) => t.id === searchParams.tab) ? searchParams.tab! : "overview";
  const db = await getDb();
  const [subs, lives, ledger, payouts, dests, settings] = await Promise.all([
    db.select().from(s.videoSubmissions).where(eq(s.videoSubmissions.userId, me.id)).orderBy(desc(s.videoSubmissions.createdAt)),
    db.select().from(s.liveSessions).where(eq(s.liveSessions.hostUserId, me.id)).orderBy(desc(s.liveSessions.scheduledAt)),
    db.select().from(s.tokenLedger).where(eq(s.tokenLedger.userId, me.id)).orderBy(desc(s.tokenLedger.createdAt)).limit(20),
    db.select().from(s.payouts).where(and(eq(s.payouts.userId, me.id), eq(s.payouts.payeeType, "creator"))).orderBy(desc(s.payouts.createdAt)),
    getVrDestinations(),
    getSettings(),
  ]);
  const earned = payouts.filter((p) => p.status !== "rejected").reduce((a, p) => a + p.amount, 0);
  const destOptions = dests.map((d) => ({ slug: d.slug, name: d.name }));

  return (
    <div className="container-page py-6 sm:py-10">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Creator studio</p>
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Film Kenya, get paid</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">
        Record walks, game drives, drone flights and boat rides. Tembea buys the best clips — in cash, tokens or both — and puts them into the 360° virtual pre-visits. Or host a live walk for travellers and earn {settings.rewardTokensPerLiveWalk} tokens.
      </p>
      <nav className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`/creators?tab=${t.id}`} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-display text-sm font-semibold", tab === t.id ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
      </nav>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      {tab === "overview" && (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
            <Stat label="Tokens" value={me.tokens.toLocaleString()} hint={`1 token ≈ KES ${settings.tokenValueKes}`} icon={Coins} tone="ochre" />
            <Stat label="Cash earned" value={kes(earned)} hint="Paid to your M-Pesa" icon={Wallet} />
            <Stat label="Videos sent" value={subs.length} hint={`${subs.filter((x) => x.status === "purchased").length} bought by Tembea`} icon={Film} tone="violet" href="/creators?tab=videos" />
            <Stat label="Live walks" value={lives.filter((l) => l.status !== "cancelled").length} icon={Radio} tone="ink" href="/creators?tab=live" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel title="What we buy">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
                <li>Steady footage, at least 1080p — 4K and 360° earn more.</li>
                <li>Real places travellers want to see: the Mara, Diani, Lamu, Tsavo, Nairobi streets, lakes and parks.</li>
                <li>Long, uncut takes (3+ minutes) beat short edits. No music or voice-over needed.</li>
                <li>You filmed it, and nobody's face is the focus without their permission.</li>
                <li>Every approved clip earns at least {settings.rewardTokensPerApprovedVideo} tokens on top of any cash offer.</li>
              </ul>
              <Link href="/creators?tab=submit" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold text-white">
                <Upload className="h-4 w-4" /> Sell a video
              </Link>
            </Panel>
            <Panel title="Token history">
              {ledger.length ? (
                <ul className="divide-y divide-ink/[0.06] text-sm">
                  {ledger.map((t) => (
                    <li key={t.id} className="flex justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate">{t.reason}</span>
                        <span className="text-xs text-ink-muted">{when(t.createdAt)}</span>
                      </span>
                      <span className={cn("font-display font-semibold", t.amount > 0 ? "text-savanna-700" : "text-maasai-600")}>
                        {t.amount > 0 ? "+" : ""}
                        {t.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">Earn tokens by selling videos, hosting live walks and writing reviews. Soon you'll spend them on AI planner credits and premium pre-visits.</p>
              )}
            </Panel>
          </div>
        </>
      )}

      {tab === "submit" && (
        <Panel title="Sell a video to Tembea">
          <form action={submitVideo} className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <input name="title" required maxLength={100} className={inputCls} placeholder="e.g. Morning game drive along the Talek river" />
            </Field>
            <Field group label="Video file" hint="Up to 500 MB. Big file? Paste a YouTube, Google Drive or Dropbox link instead." className="sm:col-span-2">
              <UploadField name="videoUrl" accept="video/*" label="Upload video" />
            </Field>
            <Field label="…or a link" className="sm:col-span-2">
              <input name="link" type="url" className={inputCls} placeholder="https://youtu.be/…" />
            </Field>
            <Field label="Destination">
              <select name="destination" required className={inputCls} defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {destOptions.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
                <option value="other">Somewhere else in Kenya</option>
              </select>
            </Field>
            <Field label="Exact spot">
              <input name="location" className={inputCls} placeholder="e.g. Talek gate, Mara" />
            </Field>
            <Field label="How it was filmed">
              <select name="mode" required className={inputCls}>
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Resolution">
              <select name="resolution" className={inputCls} defaultValue="1080p">
                {["720p", "1080p", "2.7K", "4K", "5.7K", "8K"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Length (minutes)">
              <input name="minutes" type="number" min={0} step="0.5" className={inputCls} />
            </Field>
            <Field label="Your asking price (KES)" hint="Optional — we'll make an offer either way">
              <input name="askingPrice" type="number" min={0} className={inputCls} />
            </Field>
            <Field label="M-Pesa number for payment">
              <input name="phone" inputMode="tel" defaultValue={me.phone ?? ""} className={inputCls} placeholder="0712 345 678" />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" name="is360" className="accent-savanna-600" /> This is a 360° video
            </label>
            <Field label="Notes (optional)" className="sm:col-span-2">
              <textarea name="description" rows={3} className={textareaCls} placeholder="Camera, time of day, anything special in the clip" />
            </Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="rights" required className="mt-1 accent-savanna-600" />
              <span>I filmed this myself and own the rights. If Tembea buys it, Tembea may use it in the app and on social media, with credit to me.</span>
            </label>
            <div className="sm:col-span-2">
              <Submit className="h-12 px-8">Send for review</Submit>
            </div>
          </form>
        </Panel>
      )}

      {tab === "videos" &&
        (subs.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {subs.map((x) => (
              <article key={x.id} className="rounded-3xl bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold">{x.title}</p>
                    <p className="text-xs text-ink-muted">
                      {destOptions.find((d) => d.slug === x.destination)?.name ?? x.destination} · {MODES.find((m) => m.id === x.mode)?.label.split(" (")[0]} · {x.resolution}
                      {x.is360 ? " · 360°" : ""} · {when(x.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={x.status} label={SUB_LABEL[x.status]} />
                </div>
                {/^https?:.*\.(mp4|webm|mov|m4v)(\?|$)|^\/uploads\//i.test(x.videoUrl) ? (
                  <video src={x.videoUrl} controls preload="metadata" className="mt-3 aspect-video w-full rounded-2xl bg-ink" />
                ) : (
                  <a href={x.videoUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm text-savanna-700 underline">
                    {x.videoUrl}
                  </a>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-ink-muted">You asked</dt>
                    <dd>{x.askingPrice ? kes(x.askingPrice) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Tembea offer</dt>
                    <dd className="font-display font-semibold">
                      {x.offerAmount != null ? kes(x.offerAmount) : "—"}
                      {x.rewardTokens ? ` + ${x.rewardTokens} tokens` : ""}
                    </dd>
                  </div>
                </dl>
                {x.reviewerNote && <p className="mt-2 rounded-2xl bg-sand-50 p-3 text-sm">Note from the team: {x.reviewerNote}</p>}
                {x.status === "submitted" && (
                  <form action={withdrawSubmission} className="mt-3">
                    <input type="hidden" name="id" value={x.id} />
                    <Submit small tone="danger" confirm="Withdraw this video?">
                      Withdraw
                    </Submit>
                  </form>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty text="You haven't sent any videos yet." />
        ))}

      {tab === "live" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel title="Propose a live walk">
            <p className="mb-3 text-sm text-ink-muted">Volunteers and young guides take travellers on a live walk or drive through their area. Stream on YouTube Live, TikTok Live or Instagram Live and earn {settings.rewardTokensPerLiveWalk} tokens per walk.</p>
            <form action={proposeLive} className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <input name="title" required className={inputCls} placeholder="e.g. Sunset walk through Old Town Mombasa" />
              </Field>
              <Field label="Destination">
                <select name="destination" className={inputCls}>
                  {destOptions.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Walk or drive">
                <select name="mode" className={inputCls}>
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label.split(" (")[0]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date & time (EAT)">
                <input name="when" type="datetime-local" required className={inputCls} />
              </Field>
              <Field label="Length (minutes)">
                <input name="duration" type="number" min={10} max={180} defaultValue={30} className={inputCls} />
              </Field>
              <Field label="Stream link (if you have it)" className="sm:col-span-2">
                <input name="streamUrl" type="url" className={inputCls} placeholder="https://youtube.com/live/…" />
              </Field>
              <Field label="What you'll show" className="sm:col-span-2">
                <textarea name="notes" rows={3} className={textareaCls} />
              </Field>
              <div className="sm:col-span-2">
                <Submit>Propose</Submit>
              </div>
            </form>
          </Panel>
          <Panel title="My live walks">
            {lives.length ? (
              <ul className="divide-y divide-ink/[0.06] text-sm">
                {lives.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{l.title}</span>
                      <span className="text-xs text-ink-muted">
                        {when(l.scheduledAt)} · {l.durationMin} min{l.rewardTokens ? ` · earned ${l.rewardTokens} tokens` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      {(l.status === "proposed" || l.status === "scheduled") && (
                        <form action={cancelLive}>
                          <input type="hidden" name="id" value={l.id} />
                          <Submit small tone="outline" confirm="Cancel this live walk?">
                            Cancel
                          </Submit>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No live walks yet.</p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
