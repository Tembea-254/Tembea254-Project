import { desc } from "drizzle-orm";
import { deleteAlert, saveAlert, toggleAlert } from "../actions";
import { Submit } from "@/components/admin/client";
import { Empty, Field, PageHeader, Panel, StatusBadge, inputCls, textareaCls, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Safety alerts" };

export default async function SafetyAdmin() {
  const db = await getDb();
  const alerts = await db.select().from(s.safetyAlerts).orderBy(desc(s.safetyAlerts.createdAt));
  return (
    <>
      <PageHeader title="Safety alerts" text="Travel advisories shown on the Safety page: road closures, weather, park notices and emergency information." />
      <Panel title="New alert" className="mb-5">
        <AlertForm />
      </Panel>
      {!alerts.length && <Empty text="No alerts." />}
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li key={a.id} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold">{a.title}</h3>
              <StatusBadge status={a.level === "critical" ? "failed" : a.level === "warning" ? "pending" : "scheduled"} label={a.level} />
              <StatusBadge status={a.active ? "active" : "hidden"} label={a.active ? "Showing" : "Off"} />
              <span className="text-xs text-ink-muted">
                {a.region} · {when(a.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <form action={toggleAlert}>
                <input type="hidden" name="id" value={a.id} />
                <Submit small tone="outline" name="active" value={a.active ? "false" : "true"}>
                  {a.active ? "Turn off" : "Turn on"}
                </Submit>
              </form>
              <form action={deleteAlert}>
                <input type="hidden" name="id" value={a.id} />
                <Submit small tone="danger" confirm="Delete this alert?">
                  Delete
                </Submit>
              </form>
              <details>
                <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">Edit</summary>
                <div className="mt-2">
                  <AlertForm a={a} />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function AlertForm({ a }: { a?: typeof s.safetyAlerts.$inferSelect }) {
  return (
    <form action={saveAlert} className="grid gap-3 sm:grid-cols-[1fr_160px_200px]">
      <input type="hidden" name="id" value={a?.id ?? ""} />
      <Field label="Title">
        <input name="title" required defaultValue={a?.title} className={inputCls} placeholder="Heavy rain on the Narok road" />
      </Field>
      <Field label="Level">
        <select name="level" defaultValue={a?.level ?? "info"} className={inputCls}>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </Field>
      <Field label="Region">
        <input name="region" defaultValue={a?.region ?? "All Kenya"} className={inputCls} />
      </Field>
      <Field label="Message" className="sm:col-span-3">
        <textarea name="body" required rows={3} defaultValue={a?.body} className={textareaCls} />
      </Field>
      <div>
        <Submit>{a ? "Save alert" : "Publish alert"}</Submit>
      </div>
    </form>
  );
}
