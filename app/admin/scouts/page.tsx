import { asc, desc, eq, sql } from "drizzle-orm";
import { Camera, Clock, HandCoins, Users } from "lucide-react";
import { reviewClaim, saveGig, setGigStatus } from "./actions";
import { Submit, UploadField } from "@/components/admin/client";
import { DataTable, Empty, Field, FilterTabs, PageHeader, Panel, Stat, StatusBadge, inputCls, kes, textareaCls, when } from "@/components/admin/kit";
import { placeName } from "@/components/scouts/gig-card";
import { Flash } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { PLACES } from "@/lib/data/places";
import { GIG_KIND_LABEL, scoutImpact, takenSlots } from "@/lib/repo/scouts";

export const metadata = { title: "Tembea Scouts" };
export const dynamic = "force-dynamic";

const REASONS = ["Shorter than the job asks for", "Too shaky to use", "Not filmed at the place in the brief", "Too dark or blurry", "A person is the focus without permission", "Not a 360° video", "The link doesn't open"];

export default async function ScoutsAdmin({ searchParams }: { searchParams: { tab?: string; ok?: string; error?: string; edit?: string } }) {
  const tab = ["gigs", "scouts"].includes(searchParams.tab ?? "") ? searchParams.tab! : "review";
  const db = await getDb();
  const [impact, waiting, dests] = await Promise.all([
    scoutImpact(),
    db.select({ n: sql<number>`count(*)::int` }).from(s.gigClaims).where(eq(s.gigClaims.status, "submitted")),
    db.select({ slug: s.vrDestinations.slug, name: s.vrDestinations.name }).from(s.vrDestinations).orderBy(asc(s.vrDestinations.sort)),
  ]);
  const places = [...dests.map((d) => ({ id: d.slug, name: d.name })), ...PLACES.filter((p) => !dests.some((d) => d.slug === p.id)).map((p) => ({ id: p.id, name: p.name }))];

  return (
    <>
      <PageHeader eyebrow="Travel content" title="Tembea Scouts" text="Post paid recording jobs for young creators, review what they film, and approve payment. Approved work becomes a payout in Payments & payouts." />
      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))]">
        <Stat label="Waiting for review" value={waiting[0].n} icon={Clock} tone="ochre" href="/admin/scouts" />
        <Stat label="Scouts signed up" value={impact.scouts} icon={Users} href="/admin/scouts?tab=scouts" />
        <Stat label="Approved recordings" value={impact.approved} hint={`${impact.minutes} minutes of footage`} icon={Camera} tone="violet" />
        <Stat label="Paid to young people" value={kes(impact.paidKes)} icon={HandCoins} tone="ink" href="/admin/payments?tab=payouts" />
      </div>
      <FilterTabs
        base="/admin/scouts"
        param="tab"
        value={tab === "review" ? "" : tab}
        options={[
          { value: "", label: "Review queue", count: waiting[0].n },
          { value: "gigs", label: "Jobs" },
          { value: "scouts", label: "Scouts" },
        ]}
      />
      <Flash ok={searchParams.ok} error={searchParams.error} />
      {tab === "review" && <Review />}
      {tab === "gigs" && <Gigs places={places} editId={searchParams.edit} />}
      {tab === "scouts" && <Scouts />}
    </>
  );
}

async function Review() {
  const db = await getDb();
  const rows = await db
    .select({ c: s.gigClaims, g: s.gigs, name: s.users.name, email: s.users.email, phone: s.scoutProfiles.phone })
    .from(s.gigClaims)
    .innerJoin(s.gigs, eq(s.gigs.id, s.gigClaims.gigId))
    .leftJoin(s.users, eq(s.users.id, s.gigClaims.userId))
    .leftJoin(s.scoutProfiles, eq(s.scoutProfiles.userId, s.gigClaims.userId))
    .where(eq(s.gigClaims.status, "submitted"))
    .orderBy(asc(s.gigClaims.submittedAt))
    .limit(50);
  if (!rows.length) return <Empty text="Nothing to review. New Scout recordings land here." />;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map(({ c, g, name, email, phone }) => {
        const mins = c.durationSec ? c.durationSec / 60 : null;
        const short = mins != null && mins < g.minMinutes;
        const playable = c.videoUrl && /\.(mp4|webm|mov|m4v)(\?|$)|^\/uploads\//i.test(c.videoUrl);
        return (
          <article key={c.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-semibold">{g.title}</p>
                <p className="text-xs text-ink-muted">
                  {name || email} · {phone} · submitted {when(c.submittedAt)}
                </p>
              </div>
              <span className="font-display font-bold">{kes(g.payKes)}</span>
            </div>
            {playable ? (
              <video src={c.videoUrl!} controls preload="metadata" className="mt-3 aspect-video w-full rounded-2xl bg-ink" />
            ) : (
              <a href={c.videoUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-3 block truncate rounded-2xl bg-sand-50 p-3 text-sm text-savanna-700 underline">
                {c.videoUrl}
              </a>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className={`rounded-full px-2.5 py-1 ${mins == null ? "bg-sand-100" : short ? "bg-maasai-50 text-maasai-600" : "bg-savanna-50 text-savanna-700"}`}>
                {mins == null ? "Length unknown" : `${mins.toFixed(1)} min`} / needs {g.minMinutes}
              </span>
              <span className="rounded-full bg-sand-100 px-2.5 py-1">{c.inApp ? "Recorded in the app" : "Uploaded"}</span>
              <span className="rounded-full bg-sand-100 px-2.5 py-1">{GIG_KIND_LABEL[g.kind]}</span>
            </div>
            {c.note && <p className="mt-2 rounded-2xl bg-sand-50 p-3 text-sm">&ldquo;{c.note}&rdquo;</p>}
            {g.requirements.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-display font-semibold">Checklist ({g.requirements.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                  {g.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-4 grid gap-3 border-t border-ink/[0.06] pt-4">
              <form action={reviewClaim} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="approve" />
                {g.destination && g.kind !== "live" && (
                  <label className="flex w-full items-center gap-2 text-sm">
                    <input type="checkbox" name="publishVr" defaultChecked className="h-4 w-4 accent-savanna-600" />
                    Publish it to the VR library as a Premium scene
                  </label>
                )}
                <Submit>Approve and pay {kes(g.payKes)}</Submit>
              </form>
              <form action={reviewClaim} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="reject" />
                <select name="reasonPreset" className={inputCls} defaultValue="">
                  <option value="">Reason…</option>
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input name="reason" className={inputCls} placeholder="Details for the scout" />
                <Submit tone="danger">Reject</Submit>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}

async function Gigs({ places, editId }: { places: { id: string; name: string }[]; editId?: string }) {
  const db = await getDb();
  const gigs = await db.select().from(s.gigs).orderBy(desc(s.gigs.createdAt));
  const taken = await takenSlots(gigs.map((g) => g.id));
  const edit = gigs.find((g) => g.id === editId);
  const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Panel title="Jobs on the board">
        <DataTable
          rows={gigs}
          rowKey={(g) => g.id}
          empty="No jobs yet. Post the first one."
          cols={[
            {
              label: "Job",
              cell: (g) => (
                <span className="block min-w-0">
                  <span className="block font-medium">{g.title}</span>
                  <span className="text-xs text-ink-muted">
                    {placeName(g.destination)} · {GIG_KIND_LABEL[g.kind]} · {g.minMinutes} min
                  </span>
                </span>
              ),
            },
            { label: "Pays", cell: (g) => kes(g.payKes) },
            { label: "Spots", cell: (g) => `${taken[g.id] ?? 0}/${g.slots}`, hideSm: true },
            { label: "Status", cell: (g) => <StatusBadge status={g.status} /> },
            {
              label: "",
              cell: (g) => (
                <span className="flex flex-wrap gap-1.5">
                  <a href={`/admin/scouts?tab=gigs&edit=${g.id}`} className="inline-flex h-8 items-center rounded-full border border-ink/15 px-3 text-xs font-semibold">
                    Edit
                  </a>
                  {(["open", "paused", "closed"] as const)
                    .filter((st) => st !== g.status)
                    .map((st) => (
                      <form key={st} action={setGigStatus}>
                        <input type="hidden" name="id" value={g.id} />
                        <input type="hidden" name="status" value={st} />
                        <Submit small tone={st === "closed" ? "danger" : "soft"}>
                          {st === "open" ? "Open" : st === "paused" ? "Pause" : "Close"}
                        </Submit>
                      </form>
                    ))}
                </span>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title={edit ? "Edit job" : "Post a new job"}>
        <form action={saveGig} className="grid gap-3" key={edit?.id ?? "new"}>
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <Field label="Title">
            <input name="title" required defaultValue={edit?.title} className={inputCls} placeholder="Record a 360° game drive at Maasai Mara" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select name="kind" defaultValue={edit?.kind ?? "record"} className={inputCls}>
                {Object.entries(GIG_KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Place">
              <select name="destination" defaultValue={edit?.destination ?? ""} className={inputCls}>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Exact spot">
            <input name="spot" defaultValue={edit?.spot} className={inputCls} placeholder="Talek gate to the Talek river" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pays (KES)">
              <input name="payKes" type="number" min={0} required defaultValue={edit?.payKes ?? 500} className={inputCls} />
            </Field>
            <Field label="Tokens">
              <input name="rewardTokens" type="number" min={0} defaultValue={edit?.rewardTokens ?? 200} className={inputCls} />
            </Field>
            <Field label="Spots">
              <input name="slots" type="number" min={1} defaultValue={edit?.slots ?? 1} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min. minutes">
              <input name="minMinutes" type="number" min={1} defaultValue={edit?.minMinutes ?? 30} className={inputCls} />
            </Field>
            <Field label="Deadline">
              <input name="deadline" type="datetime-local" defaultValue={dt(edit?.deadline ?? null)} className={inputCls} />
            </Field>
            <Field label="Live at">
              <input name="scheduledAt" type="datetime-local" defaultValue={dt(edit?.scheduledAt ?? null)} className={inputCls} />
            </Field>
          </div>
          <Field label="Brief">
            <textarea name="brief" rows={3} defaultValue={edit?.brief} className={textareaCls} placeholder="What to film and how" />
          </Field>
          <Field label="Checklist" hint="One per line. Reviews are done against this list.">
            <textarea name="requirements" rows={4} defaultValue={edit?.requirements.join("\n")} className={textareaCls} placeholder={"30 minutes or more, one take\n4K or better\nCamera on a mount"} />
          </Field>
          <Field group label="Cover photo">
            <UploadField name="cover" defaultValue={edit?.cover ?? undefined} label="Upload photo" />
          </Field>
          <Submit className="h-11">{edit ? "Save job" : "Post job"}</Submit>
        </form>
      </Panel>
    </div>
  );
}

async function Scouts() {
  const db = await getDb();
  const rows = await db
    .select({
      p: s.scoutProfiles,
      name: s.users.name,
      email: s.users.email,
      done: sql<number>`(select count(*)::int from gig_claims c where c.user_id = ${s.scoutProfiles.userId} and c.status in ('approved','paid'))`,
      earned: sql<number>`(select coalesce(sum(amount),0)::int from payouts po where po.user_id = ${s.scoutProfiles.userId} and po.payee_type = 'scout' and po.status in ('approved','paid'))`,
    })
    .from(s.scoutProfiles)
    .leftJoin(s.users, eq(s.users.id, s.scoutProfiles.userId))
    .orderBy(desc(s.scoutProfiles.createdAt))
    .limit(200);
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.p.userId}
      empty="No scouts yet. Share /scouts with youth groups, campuses and photography clubs."
      cols={[
        { label: "Scout", cell: (r) => <span className="block"><span className="block font-medium">{r.name || r.email}</span><span className="text-xs text-ink-muted">{r.email}</span></span> },
        { label: "M-Pesa", cell: (r) => r.p.phone },
        { label: "Area", cell: (r) => [r.p.county, ...r.p.areas].filter(Boolean).join(", ") || "—", hideSm: true },
        { label: "Camera", cell: (r) => r.p.device, hideSm: true },
        { label: "Approved", cell: (r) => r.done },
        { label: "Earned", cell: (r) => kes(r.earned) },
        { label: "Joined", cell: (r) => when(r.p.createdAt), hideSm: true },
      ]}
    />
  );
}
