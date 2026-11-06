import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Coins, Film, Radio, ShieldCheck } from "lucide-react";
import { applyCreator } from "../actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Field, inputCls, textareaCls } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { ApplicationStatus } from "@/components/shop/application-status";
import { CREATOR_FILMS, CREATOR_GEAR, labelOf, type CreatorApplication } from "@/lib/data/creators";
import { HUB_NAMES } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { workspaceAccess } from "@/lib/repo/workspaces";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Become a Tembea254 creator" };

const chip = "inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm has-[:checked]:border-savanna-500 has-[:checked]:bg-savanna-50";

export default async function JoinCreator({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const access = await workspaceAccess(me);
  if (access.creator === "approved") redirect("/creators");
  const db = await getDb();
  const [app] = await db
    .select()
    .from(s.applications)
    .where(and(eq(s.applications.userId, me.id), eq(s.applications.kind, "creator")))
    .orderBy(desc(s.applications.createdAt))
    .limit(1);
  const d = (app?.data ?? null) as CreatorApplication | null;
  const settings = await getSettings();

  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/marketplace/join" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Earn with Tembea254
      </Link>
      <Flash {...searchParams} />
      {app?.status === "pending" && d ? (
        <ApplicationStatus
          kind="creator"
          submittedAt={app.createdAt}
          summary={[
            { label: "Name", value: d.name },
            { label: "Creator name", value: d.channel ?? "" },
            { label: "Home area", value: d.hub ? HUB_NAMES[d.hub] ?? d.hub : "" },
            { label: "Films", value: d.films.map((x) => labelOf(CREATOR_FILMS, x)).join(", ") },
            { label: "Gear", value: d.gear.map((x) => labelOf(CREATOR_GEAR, x)).join(", ") },
          ]}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <form action={applyCreator} className="space-y-6 rounded-3xl bg-white p-5 shadow-card sm:p-6">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Tembea254 creators</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{app?.status === "rejected" ? "Update your creator application" : "Apply to be a creator"}</h1>
              <p className="mt-1 text-sm text-ink-muted">Tell us who you are, what you film and show us a little of your work. Once an admin approves you, your Creator studio opens in the sidebar.</p>
            </div>
            {app?.status === "rejected" && (
              <p role="alert" className="rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">
                We couldn&apos;t approve your last application.{app.note ? ` Note from Tembea: ${app.note}` : ""} Update it and send again.
              </p>
            )}

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-display font-semibold">About you</legend>
              <Field label="Full name">
                <input name="name" required minLength={3} maxLength={80} defaultValue={d?.name ?? me.name} className={inputCls} />
              </Field>
              <Field label="Creator name (optional)" hint="How your credit appears on videos">
                <input name="channel" maxLength={60} defaultValue={d?.channel ?? (me.handle ? `@${me.handle}` : "")} className={inputCls} placeholder="@wanjiku.films" />
              </Field>
              <Field label="M-Pesa number" hint="Creator payments are sent here">
                <input name="phone" required inputMode="tel" defaultValue={d?.phone ?? me.phone ?? ""} className={inputCls} placeholder="0712 345 678" />
              </Field>
              <Field label="Where you film most">
                <select name="hub" defaultValue={d?.hub ?? ""} className={inputCls}>
                  <option value="">Anywhere in Kenya</option>
                  {Object.entries(HUB_NAMES).map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-display font-semibold">What do you film?</legend>
              <div className="flex flex-wrap gap-2">
                {CREATOR_FILMS.map((c) => (
                  <label key={c.id} className={chip}>
                    <input type="checkbox" name="films" value={c.id} defaultChecked={d?.films.includes(c.id)} className="accent-savanna-600" /> {c.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-display font-semibold">What do you film with?</legend>
              <div className="flex flex-wrap gap-2">
                {CREATOR_GEAR.map((c) => (
                  <label key={c.id} className={chip}>
                    <input type="checkbox" name="gear" value={c.id} defaultChecked={d?.gear.includes(c.id)} className="accent-savanna-600" /> {c.label}
                  </label>
                ))}
              </div>
              <Field label="KCAA remote pilot licence no. (drone pilots only)" className="mt-3 sm:max-w-sm">
                <input name="droneLicence" maxLength={40} defaultValue={d?.droneLicence ?? ""} className={inputCls} placeholder="Required if you fly a drone" />
              </Field>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-display font-semibold">Your work</legend>
              <Field label="TikTok">
                <input name="tiktok" type="url" defaultValue={d?.links?.tiktok} className={inputCls} placeholder="https://www.tiktok.com/@…" />
              </Field>
              <Field label="Instagram">
                <input name="instagram" type="url" defaultValue={d?.links?.instagram} className={inputCls} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="YouTube">
                <input name="youtube" type="url" defaultValue={d?.links?.youtube} className={inputCls} placeholder="https://youtube.com/@…" />
              </Field>
              <Field label="Other (portfolio, Drive folder)">
                <input name="other" type="url" defaultValue={d?.links?.other} className={inputCls} placeholder="https://…" />
              </Field>
              <Field group label="Sample clip (optional)" hint="Upload a short clip, or paste a link below. At least one link or a sample is needed." className="sm:col-span-2">
                <UploadField name="sample" accept="video/*" label="Upload sample" />
              </Field>
              <Field label="…or sample link" className="sm:col-span-2">
                <input name="sampleLink" type="url" defaultValue={d?.sample ?? ""} className={inputCls} placeholder="https://youtu.be/…" />
              </Field>
              <Field label="Tell us about yourself" className="sm:col-span-2">
                <textarea name="about" required minLength={30} maxLength={1200} rows={4} defaultValue={d?.about} className={textareaCls} placeholder="What you love filming, places you know well, and anything you've made before." />
              </Field>
            </fieldset>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="agree" required className="mt-1 accent-savanna-600" />
              <span>I only send footage I filmed myself, I get permission before filming people up close, I follow park, KWS and KCAA rules, and Tembea may use clips it buys in its 360° pre-visits with my credit.</span>
            </label>
            <Submit className="h-12 w-full sm:w-auto sm:px-8">{app?.status === "rejected" ? "Send again" : "Send application"}</Submit>
          </form>
          <aside className="space-y-3">
            {[
              { icon: Film, t: "We buy your clips", d: "Cash to M-Pesa, tokens, or both — for walks, drives, flights and boat rides." },
              { icon: Coins, t: `${settings.rewardTokensPerApprovedVideo}+ tokens per approved clip`, d: "On top of any cash offer, with your name credited in the pre-visit." },
              { icon: Radio, t: "Host live walks", d: `Stream a walk for travellers and earn ${settings.rewardTokensPerLiveWalk} tokens each time.` },
              { icon: ShieldCheck, t: "Reviewed in 2 days", d: "An admin checks your work. Your Creator studio opens in the sidebar once you're approved." },
            ].map((x) => (
              <div key={x.t} className="flex gap-3 rounded-3xl bg-white p-4 shadow-card">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-dusk-50 text-dusk-500">
                  <x.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-display font-semibold">{x.t}</span>
                  <span className="text-sm text-ink-muted">{x.d}</span>
                </span>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
