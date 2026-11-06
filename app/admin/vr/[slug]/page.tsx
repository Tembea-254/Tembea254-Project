import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { addScene, deleteScene, updateDestination, updateScene } from "../../actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Field, PageHeader, Panel, StatusBadge, inputCls, textareaCls } from "@/components/admin/kit";
import { MODES } from "@/lib/data/vr";
import { getDb, schema as s } from "@/lib/db";

export default async function VrDestinationAdmin({ params }: { params: { slug: string } }) {
  const db = await getDb();
  const d = (await db.select().from(s.vrDestinations).where(eq(s.vrDestinations.slug, params.slug)))[0];
  if (!d) notFound();
  const scenes = await db.select().from(s.vrScenes).where(eq(s.vrScenes.destinationSlug, d.slug)).orderBy(asc(s.vrScenes.sort));
  const data = d.data as { tagline?: string; description?: string; bestTime?: string; cover?: string };
  return (
    <>
      <Link href="/admin/vr" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All destinations
      </Link>
      <PageHeader
        title={d.name}
        text={`${scenes.filter((x) => x.published).length} of ${scenes.length} scenes live`}
        actions={
          <Link href={`/vr/${d.slug}`} target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 font-display text-sm font-semibold">
            Open player <ExternalLink className="h-4 w-4" />
          </Link>
        }
      />

      <Panel title="Scenes" className="mb-5">
        <ul className="divide-y divide-ink/[0.06]">
          {scenes.map((sc) => {
            const src = sc.source as { kind: string; id?: string; src?: string };
            return (
              <li key={sc.id} className="py-3">
                <form action={updateScene} className="grid items-end gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr))]">
                  <input type="hidden" name="id" value={sc.id} />
                  <Field label="Title" className="col-span-2">
                    <input name="title" defaultValue={sc.title} className={inputCls} />
                  </Field>
                  <Field label="Spot">
                    <input name="spot" defaultValue={sc.spot} className={inputCls} />
                  </Field>
                  <Field label="Mode">
                    <select name="mode" defaultValue={sc.mode} className={inputCls}>
                      {MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.verb}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time">
                    <select name="time" defaultValue={sc.time} className={inputCls}>
                      <option value="day">Day</option>
                      <option value="night">Night</option>
                    </select>
                  </Field>
                  <Field label="Order">
                    <input name="sort" type="number" defaultValue={sc.sort} className={inputCls} />
                  </Field>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <Submit small>Save</Submit>
                  </div>
                </form>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <StatusBadge status={sc.published ? "published" : "hidden"} />
                  {sc.premium && <StatusBadge status="scheduled" label="Premium" />}
                  <span>
                    {src.kind === "youtube" ? (
                      <a className="underline" href={`https://youtu.be/${src.id}`} target="_blank" rel="noreferrer">
                        YouTube {src.id}
                      </a>
                    ) : (
                      <a className="underline" href={src.src} target="_blank" rel="noreferrer">
                        {src.kind} file
                      </a>
                    )}{" "}
                    · {sc.credit || "no credit"}
                  </span>
                  <form action={updateScene} className="ml-auto flex gap-1.5">
                    <input type="hidden" name="id" value={sc.id} />
                    <Submit small tone="outline" name="published" value={sc.published ? "false" : "true"}>
                      {sc.published ? "Hide" : "Publish"}
                    </Submit>
                  </form>
                  <form action={updateScene}>
                    <input type="hidden" name="id" value={sc.id} />
                    <Submit small tone="outline" name="premium" value={sc.premium ? "false" : "true"}>
                      {sc.premium ? "Make free" : "Make premium"}
                    </Submit>
                  </form>
                  <form action={deleteScene}>
                    <input type="hidden" name="id" value={sc.id} />
                    <Submit small tone="danger" confirm="Delete this scene?">
                      Delete
                    </Submit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Add a scene">
          <form action={addScene} className="space-y-3">
            <input type="hidden" name="slug" value={d.slug} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <input name="title" required className={inputCls} placeholder="Walking along the beach" />
              </Field>
              <Field label="Spot (short)">
                <input name="spot" required className={inputCls} placeholder="Shoreline" />
              </Field>
              <Field label="How the camera moves">
                <select name="mode" className={inputCls}>
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.verb}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Source">
                <select name="kind" className={inputCls}>
                  <option value="youtube">YouTube 360° video</option>
                  <option value="video">Uploaded 360° video (MP4)</option>
                  <option value="photo">360° photo</option>
                </select>
              </Field>
            </div>
            <Field label="YouTube link / ID, or a file URL" hint="Or upload a file below instead.">
              <input name="value" className={inputCls} placeholder="https://youtu.be/…" />
            </Field>
            <UploadField name="upload" accept="video/*,image/*" label="Upload 360° file" />
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Start (sec)">
                <input name="start" type="number" min={0} className={inputCls} />
              </Field>
              <Field label="Minutes">
                <input name="minutes" type="number" min={1} defaultValue={2} className={inputCls} />
              </Field>
              <Field label="Time">
                <select name="time" className={inputCls}>
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                </select>
              </Field>
              <Field label="Credit">
                <input name="credit" className={inputCls} placeholder="Creator" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="premium" /> Premium only
            </label>
            <Submit>Add scene</Submit>
          </form>
        </Panel>
        <Panel title="Destination details">
          <form action={updateDestination} className="space-y-3">
            <input type="hidden" name="slug" value={d.slug} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" defaultValue={d.name} className={inputCls} />
              </Field>
              <Field label="Region">
                <input name="region" defaultValue={d.region} className={inputCls} />
              </Field>
            </div>
            <Field label="Tagline">
              <input name="tagline" defaultValue={data.tagline} className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea name="description" defaultValue={data.description} rows={4} className={textareaCls} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Best time">
                <input name="bestTime" defaultValue={data.bestTime} className={inputCls} />
              </Field>
              <Field label="Cover image (URL or Unsplash id)">
                <input name="cover" defaultValue={data.cover} className={inputCls} />
              </Field>
            </div>
            <Submit tone="dark">Save details</Submit>
          </form>
        </Panel>
      </div>
    </>
  );
}
