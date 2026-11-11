import Link from "next/link";
import { BadgeCheck, Briefcase, Camera, CheckCircle2, Clock, HandCoins, Hourglass, ListChecks, Send, Smartphone, Wallet, XCircle } from "lucide-react";
import { joinScouts } from "./actions";
import { Submit } from "@/components/admin/client";
import { Empty, Field, Panel, Stat, StatusBadge, inputCls, kes, when } from "@/components/admin/kit";
import { GigCard, placeName } from "@/components/scouts/gig-card";
import { Flash } from "@/components/shell/workspace-tabs";
import { KENYA_COUNTIES } from "@/lib/data/shop";
import { CLAIM_LABEL, getScout, myClaims, openGigs, releaseExpiredClaims, scoutEarnings, scoutImpact } from "@/lib/repo/scouts";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tembea Scouts" };

const TABS = [
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "mine", label: "My jobs", icon: ListChecks },
  { id: "earnings", label: "Earnings", icon: Wallet },
];

const STEPS = [
  { icon: Briefcase, title: "Pick a paid job", text: "Each job says where to film, for how long, and exactly what it pays." },
  { icon: Camera, title: "Go and record it", text: "Film in the app with your phone, or upload from a 360° camera or drone." },
  { icon: Send, title: "Submit for review", text: "We check it against the job's checklist within 2 working days." },
  { icon: HandCoins, title: "Get paid on M-Pesa", text: "Approved work is paid to your number, plus Tembea tokens." },
];

const prettyPhone = (p: string) => (p.startsWith("254") ? `0${p.slice(3)}` : p);

export default async function ScoutsPage({ searchParams }: { searchParams: { tab?: string; ok?: string; error?: string } }) {
  const me = await requireUser();
  const settings = await getSettings();
  await releaseExpiredClaims(settings.scoutClaimHours);
  const [scout, gigs, impact] = await Promise.all([getScout(me.id), openGigs(), scoutImpact()]);

  if (!scout) return <Onboarding gigs={gigs} impact={impact} name={me.name} phone={me.phone ?? ""} flash={searchParams} />;

  const tab = TABS.some((t) => t.id === searchParams.tab) ? searchParams.tab! : "jobs";
  const [claims, money] = await Promise.all([myClaims(me.id), scoutEarnings(me.id)]);
  const active = claims.filter((x) => x.c.status !== "dropped");
  const mineIds = new Set(active.map((x) => x.g.id));
  const pendingReview = active.filter((x) => x.c.status === "submitted").length;
  const reserved = active.filter((x) => x.c.status === "claimed");

  return (
    <div className="container-page py-6 sm:py-10">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-savanna-600">Tembea Scouts</p>
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Habari {me.name.split(" ")[0] || "Scout"}, ready to earn?</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">Film the places travellers want to see before they visit. Every approved recording is paid to {prettyPhone(scout.phone)}.</p>

      <div className="mb-6 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))]">
        <Stat label="Paid to you" value={kes(money.paid)} hint="Sent to M-Pesa" icon={HandCoins} />
        <Stat label="On the way" value={kes(money.pending)} hint="Approved, being paid" icon={Hourglass} tone="ochre" />
        <Stat label="Pending review" value={pendingReview} hint="We review within 2 days" icon={Clock} tone="violet" href="/scouts?tab=mine" />
        <Stat label="Tokens" value={me.tokens.toLocaleString()} hint={`1 token ≈ KES ${settings.tokenValueKes}`} icon={BadgeCheck} tone="ink" />
      </div>

      <nav className="scrollbar-none -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`/scouts?tab=${t.id}`} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-display text-sm font-semibold", tab === t.id ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card")}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.id === "mine" && reserved.length > 0 && <span className="rounded-full bg-ochre-400 px-1.5 text-[11px] text-ink">{reserved.length}</span>}
          </Link>
        ))}
      </nav>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      {tab === "jobs" &&
        (gigs.length ? (
          <>
            {reserved.length > 0 && (
              <Link href={`/scouts/${reserved[0].g.id}`} className="mb-4 flex items-center justify-between gap-3 rounded-3xl bg-ochre-50 p-4 text-sm text-ochre-700">
                <span>
                  You have <b>{reserved.length}</b> reserved job{reserved.length > 1 ? "s" : ""} waiting for your recording.
                </span>
                <span className="shrink-0 font-display font-semibold">Continue</span>
              </Link>
            )}
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
              {gigs.map((g) => (
                <div key={g.id} className="relative">
                  <GigCard gig={g} left={g.left} href={`/scouts/${g.id}`} />
                  {mineIds.has(g.id) && <span className="absolute right-3 top-3 rounded-full bg-savanna-500 px-2.5 py-1 font-display text-xs font-semibold text-white">Yours</span>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty text="No open jobs right now. New ones are posted every week, and we'll notify you." />
        ))}

      {tab === "mine" &&
        (active.length ? (
          <div className="grid gap-3">
            {active.map(({ c, g }) => (
              <Link key={c.id} href={`/scouts/${g.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-card hover:shadow-lift">
                <div className="min-w-0">
                  <p className="font-display font-semibold">{g.title}</p>
                  <p className="text-xs text-ink-muted">
                    {placeName(g.destination)} · KES {g.payKes.toLocaleString("en-KE")} · {c.submittedAt ? `submitted ${when(c.submittedAt)}` : `reserved ${when(c.claimedAt)}`}
                  </p>
                  {c.status === "rejected" && c.reviewerNote && <p className="mt-1 text-sm text-maasai-600">Why: {c.reviewerNote}</p>}
                </div>
                <ClaimBadge status={c.status} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="You haven't taken a job yet. Pick one from the Jobs tab." />
        ))}

      {tab === "earnings" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Approved work">
            {active.filter((x) => ["approved", "paid"].includes(x.c.status)).length ? (
              <ul className="divide-y divide-ink/[0.06] text-sm">
                {active
                  .filter((x) => ["approved", "paid"].includes(x.c.status))
                  .map(({ c, g }) => (
                    <li key={c.id} className="flex justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate">{g.title}</span>
                        <span className="text-xs text-ink-muted">{when(c.reviewedAt)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display font-semibold">{kes(g.payKes)}</span>
                        <StatusBadge status={c.status} />
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Your approved jobs and payments appear here.</p>
            )}
          </Panel>
          <Panel title="How you get paid">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              <li>Approved jobs are paid by M-Pesa to {prettyPhone(scout.phone)}, usually within 3 working days.</li>
              <li>Every approved job also earns Tembea tokens you can spend in the app.</li>
              <li>If a job isn&apos;t approved, we tell you why. Fix it and submit again while the job is open.</li>
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

function ClaimBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    claimed: "bg-dusk-50 text-dusk-500",
    submitted: "bg-ochre-50 text-ochre-700",
    approved: "bg-savanna-50 text-savanna-700",
    paid: "bg-savanna-500 text-white",
    rejected: "bg-maasai-50 text-maasai-600",
  };
  const Icon = status === "rejected" ? XCircle : status === "submitted" ? Hourglass : status === "claimed" ? Clock : CheckCircle2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-semibold", tone[status] ?? "bg-sand-100")}>
      <Icon className="h-3.5 w-3.5" /> {CLAIM_LABEL[status] ?? status}
    </span>
  );
}

function Onboarding({ gigs, impact, name, phone, flash }: { gigs: Awaited<ReturnType<typeof openGigs>>; impact: Awaited<ReturnType<typeof scoutImpact>>; name: string; phone: string; flash: { ok?: string; error?: string } }) {
  const top = gigs.slice(0, 3);
  const best = Math.max(0, ...gigs.map((g) => g.payKes));
  return (
    <div>
      <section className="relative overflow-hidden bg-night text-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_90%_0%,rgba(20,168,95,0.35),transparent_60%),radial-gradient(700px_380px_at_0%_100%,rgba(242,177,58,0.25),transparent_60%)]" />
        <div className="container-page relative py-10 sm:py-14">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-savanna-300">Tembea Scouts</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">Film Kenya&apos;s best places. Get paid on M-Pesa.</h1>
          <p className="mt-3 max-w-xl text-white/75">Paid recording jobs for young creators. All you need is a smartphone. Travellers around the world use your videos to preview Kenya in 360° before they book.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
              <b className="font-display text-lg">{gigs.length}</b> open jobs
            </span>
            {best > 0 && (
              <span className="rounded-2xl bg-ochre-400 px-4 py-2 font-display text-ink">
                Up to <b className="text-lg">KES {best.toLocaleString("en-KE")}</b> a job
              </span>
            )}
            {impact.paidKes > 0 && (
              <span className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
                <b className="font-display text-lg">{kes(impact.paidKes)}</b> paid to Scouts so far
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="container-page py-8">
        <Flash ok={flash.ok} error={flash.error} />
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 space-y-8">
            <section>
              <h2 className="mb-4 text-xl font-bold">How you earn</h2>
              <ol className="grid gap-3 sm:grid-cols-2">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3 rounded-3xl bg-white p-4 shadow-card">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-savanna-50 text-savanna-700">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="font-display text-xs font-semibold text-ink-muted">Step {i + 1}</span>
                      <span className="block font-display font-semibold">{s.title}</span>
                      <span className="text-sm text-ink-muted">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            {top.length > 0 && (
              <section>
                <h2 className="mb-1 text-xl font-bold">Jobs open right now</h2>
                <p className="mb-4 text-sm text-ink-muted">Join in a minute to take one.</p>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
                  {top.map((g) => (
                    <GigCard key={g.id} gig={g} left={g.left} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside>
            <Panel title="Join Tembea Scouts" className="lg:sticky lg:top-6">
              <form action={joinScouts} className="grid gap-4">
                <p className="text-sm text-ink-muted">Hi {name.split(" ")[0] || "there"}! Tell us where to pay you and where you can film.</p>
                <Field label="M-Pesa number">
                  <input name="phone" required inputMode="tel" defaultValue={phone} className={inputCls} placeholder="0712 345 678" />
                </Field>
                <Field label="Your county">
                  <select name="county" className={inputCls} defaultValue="">
                    <option value="">Choose…</option>
                    {KENYA_COUNTIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="What will you film with?">
                  <select name="device" className={inputCls} defaultValue="phone">
                    <option value="phone">Smartphone</option>
                    <option value="360">360° camera (Insta360, Osmo 360…)</option>
                    <option value="drone">Drone</option>
                    <option value="action">Action camera (GoPro…)</option>
                  </select>
                </Field>
                <Field label="Places you can get to" hint="e.g. Diani, Mombasa, Shimba Hills">
                  <input name="areas" className={inputCls} />
                </Field>
                <div className="rounded-2xl bg-sand-50 p-3 text-xs text-ink-soft">
                  <p className="mb-1 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                    <Smartphone className="h-4 w-4" /> Scout rules
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Only film what you shot yourself, at the place the job names.</li>
                    <li>Stay safe: no restricted areas, no filming while driving, follow ranger and park rules.</li>
                    <li>Don&apos;t make anyone the focus of a shot without their permission.</li>
                    <li>Approved recordings become Tembea&apos;s to use in the app, with credit to you.</li>
                  </ul>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="agree" required className="mt-1 accent-savanna-600" /> I agree to the Scout rules
                </label>
                <Submit className="h-12">Join and see all jobs</Submit>
              </form>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
