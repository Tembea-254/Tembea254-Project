import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarClock, Check, Clock, Coins, MapPin, Users, XCircle } from "lucide-react";
import { claimGig, dropClaim, submitClaim } from "../actions";
import { Submit } from "@/components/admin/client";
import { Panel, kes, mediaSrc, when } from "@/components/admin/kit";
import { KIND_ICON, placeName } from "@/components/scouts/gig-card";
import { ScoutSubmit } from "@/components/scouts/recorder";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { GIG_KIND_LABEL, getScout, takenSlots } from "@/lib/repo/scouts";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGES = [
  { id: "claimed", label: "Reserved" },
  { id: "submitted", label: "Submitted · pending review" },
  { id: "approved", label: "Approved" },
  { id: "paid", label: "Paid to M-Pesa" },
];

export default async function GigPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  if (!(await getScout(me.id))) redirect("/scouts");
  const db = await getDb();
  const gig = (await db.select().from(s.gigs).where(eq(s.gigs.id, params.id)))[0];
  if (!gig) notFound();
  const [claims, taken, settings] = await Promise.all([
    db.select().from(s.gigClaims).where(and(eq(s.gigClaims.gigId, gig.id), eq(s.gigClaims.userId, me.id))).orderBy(desc(s.gigClaims.claimedAt)),
    takenSlots([gig.id]),
    getSettings(),
  ]);
  const claim = claims.find((c) => c.status !== "dropped");
  const left = Math.max(0, gig.slots - (taken[gig.id] ?? 0));
  const Icon = KIND_ICON[gig.kind] ?? Clock;
  const stageIdx = claim ? STAGES.findIndex((x) => x.id === claim.status) : -1;
  const expires = claim?.status === "claimed" ? new Date(claim.claimedAt.getTime() + settings.scoutClaimHours * 3600_000) : null;

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden bg-night text-white">
        {gig.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(gig.cover, 1400, 600)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/10" />
        <div className="container-page relative pb-8 pt-6">
          <Link href="/scouts" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
            <ArrowLeft className="h-4 w-4" /> All jobs
          </Link>
          <div className="mt-10 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-display text-xs font-semibold backdrop-blur">
              <Icon className="h-3.5 w-3.5" /> {GIG_KIND_LABEL[gig.kind]}
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-4xl">{gig.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-white/75">
              <MapPin className="h-4 w-4" /> {gig.spot ? `${gig.spot}, ` : ""}
              {placeName(gig.destination)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className="rounded-2xl bg-ochre-400 px-4 py-2 font-display font-bold text-ink">Earn KES {gig.payKes.toLocaleString("en-KE")}</span>
              {gig.rewardTokens > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
                  <Coins className="h-4 w-4" /> +{gig.rewardTokens} tokens
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
                <Clock className="h-4 w-4" /> {gig.kind === "live" ? `${gig.minMinutes} min live` : `${gig.minMinutes}+ minutes`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
                <Users className="h-4 w-4" /> {left ? `${left} of ${gig.slots} spots left` : "All spots taken"}
              </span>
              {(gig.scheduledAt || gig.deadline) && (
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
                  <CalendarClock className="h-4 w-4" /> {gig.scheduledAt ? `Live ${when(gig.scheduledAt)}` : `Submit by ${when(gig.deadline)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Flash ok={searchParams.ok} error={searchParams.error} />

          {claim && (
            <Panel title="Your progress">
              {claim.status === "rejected" ? (
                <div className="rounded-2xl bg-maasai-50 p-4 text-sm text-maasai-700">
                  <p className="flex items-center gap-2 font-display font-semibold">
                    <XCircle className="h-4 w-4" /> Not approved this time
                  </p>
                  <p className="mt-1">{claim.reviewerNote || "The recording didn't meet the checklist."}</p>
                  {gig.status === "open" && <p className="mt-2 text-maasai-600">You can fix it and submit again below.</p>}
                </div>
              ) : (
                <ol className="grid gap-2 sm:grid-cols-4">
                  {STAGES.map((st, i) => (
                    <li key={st.id} className={cn("flex items-center gap-2 rounded-2xl p-3 text-sm", i <= stageIdx ? "bg-savanna-50 text-savanna-800" : "bg-sand-50 text-ink-muted")}>
                      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", i <= stageIdx ? "bg-savanna-500 text-white" : "bg-white")}>{i < stageIdx || claim.status === "paid" ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                      {st.label}
                    </li>
                  ))}
                </ol>
              )}
              {expires && <p className="mt-3 text-sm text-ink-muted">Reserved for you until {when(expires)}. After that it goes back on the board.</p>}
              {claim.status === "submitted" && <p className="mt-3 text-sm text-ink-muted">Submitted {when(claim.submittedAt)}. We&apos;ll notify you as soon as it&apos;s reviewed.</p>}
              {claim.status === "approved" && <p className="mt-3 text-sm text-savanna-700">Approved! {kes(gig.payKes)} is on its way to your M-Pesa.</p>}
            </Panel>
          )}

          {claim && ["claimed", "rejected"].includes(claim.status) && gig.status === "open" && (
            <Panel title={gig.kind === "live" ? "After your live walk: hand in the recording" : "Record and submit"}>
              <ScoutSubmit claimId={claim.id} minMinutes={gig.minMinutes} requirements={gig.requirements} is360={gig.kind === "record360"} action={submitClaim} />
            </Panel>
          )}

          <Panel title="The brief">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{gig.brief || "Record the spot named above, steadily and in good light."}</p>
          </Panel>
          {gig.requirements.length > 0 && (
            <Panel title="What we check before paying">
              <ul className="space-y-2 text-sm">
                {gig.requirements.map((r) => (
                  <li key={r} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> {r}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel className="lg:sticky lg:top-6">
            <p className="text-sm text-ink-muted">You earn</p>
            <p className="font-display text-3xl font-bold">{kes(gig.payKes)}</p>
            {gig.rewardTokens > 0 && <p className="text-sm text-ink-muted">+ {gig.rewardTokens} Tembea tokens</p>}
            <div className="mt-4">
              {!claim ? (
                gig.status === "open" && left > 0 ? (
                  <form action={claimGig}>
                    <input type="hidden" name="gigId" value={gig.id} />
                    <Submit className="h-12 w-full">Take this job</Submit>
                    <p className="mt-2 text-xs text-ink-muted">We hold it for you for {settings.scoutClaimHours} hours.</p>
                  </form>
                ) : (
                  <p className="rounded-2xl bg-sand-50 p-3 text-sm text-ink-muted">This job is full or closed.</p>
                )
              ) : claim.status === "claimed" ? (
                <form action={dropClaim}>
                  <input type="hidden" name="claimId" value={claim.id} />
                  <Submit tone="outline" className="w-full" confirm="Release this job so someone else can take it?">
                    Release this job
                  </Submit>
                </form>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
