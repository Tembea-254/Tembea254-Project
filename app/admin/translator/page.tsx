import { asc, gte, sql } from "drizzle-orm";
import { Languages } from "lucide-react";
import { deletePhrase, savePhrase } from "../actions";
import { Submit } from "@/components/admin/client";
import { Field, PageHeader, Panel, Stat, StatusBadge, inputCls } from "@/components/admin/kit";
import { LANG_BY_CODE } from "@/lib/data/languages";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Translator" };

const LANGS = [
  ["sw", "Swahili"],
  ["ki", "Kikuyu"],
  ["luo", "Dholuo"],
  ["mas", "Maa"],
  ["kln", "Kalenjin"],
] as const;
const CATS = ["Greetings", "Courtesy", "Getting around", "Food & shopping", "Emergencies", "Safari"];
const name = (code: string) => (LANG_BY_CODE as Record<string, { name?: string }>)[code]?.name ?? code;

export default async function TranslatorAdmin() {
  const db = await getDb();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [phrases, total, pairs] = await Promise.all([
    db.select().from(s.phrases).orderBy(asc(s.phrases.category), asc(s.phrases.english)),
    db.select({ n: sql<number>`count(*)::int`, chars: sql<number>`coalesce(sum(${s.translationLogs.chars}),0)::int` }).from(s.translationLogs).where(gte(s.translationLogs.createdAt, since)),
    db.select({ from: s.translationLogs.fromLang, to: s.translationLogs.toLang, n: sql<number>`count(*)::int` }).from(s.translationLogs).where(gte(s.translationLogs.createdAt, since)).groupBy(s.translationLogs.fromLang, s.translationLogs.toLang).orderBy(sql`3 desc`).limit(8),
  ]);
  return (
    <>
      <PageHeader title="Translator" text="See how travellers use the translator and manage the offline phrasebook (it powers instant answers and works without internet)." />
      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))]">
        <Stat label="Translations · 30 days" value={total[0].n} icon={Languages} />
        <Stat label="Characters translated" value={total[0].chars.toLocaleString()} icon={Languages} tone="violet" />
        <Stat label="Phrasebook entries" value={phrases.length} icon={Languages} tone="ochre" />
      </div>
      {pairs.length > 0 && (
        <Panel title="Top language pairs" className="mb-5">
          <div className="flex flex-wrap gap-2">
            {pairs.map((p) => (
              <span key={p.from + p.to} className="rounded-full bg-sand-100 px-3 py-1.5 text-sm">
                {name(p.from)} → {name(p.to)} <strong className="ml-1">{p.n}</strong>
              </span>
            ))}
          </div>
        </Panel>
      )}
      <Panel title="Add a phrase" className="mb-5">
        <PhraseForm />
      </Panel>
      <Panel title="Phrasebook">
        <ul className="divide-y divide-ink/[0.06]">
          {phrases.map((p) => (
            <li key={p.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm">
                  <strong>{p.english}</strong>
                  <span className="text-ink-muted">· {p.translations.sw ?? "—"}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <StatusBadge status="draft" label={p.category} />
                    {!p.published && <StatusBadge status="hidden" />}
                  </span>
                </summary>
                <div className="mt-3">
                  <PhraseForm p={p} />
                  <form action={deletePhrase} className="mt-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Submit small tone="danger" confirm="Delete this phrase?">
                      Delete
                    </Submit>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function PhraseForm({ p }: { p?: typeof s.phrases.$inferSelect }) {
  return (
    <form action={savePhrase} className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr))]">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <Field label="English">
        <input name="english" required defaultValue={p?.english} className={inputCls} />
      </Field>
      <Field label="Category">
        <select name="category" defaultValue={p?.category ?? "Greetings"} className={inputCls}>
          {CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {LANGS.map(([code, label]) => (
        <Field key={code} label={label}>
          <input name={code} defaultValue={p?.translations[code]} className={inputCls} />
        </Field>
      ))}
      <Field label="Visible">
        <select name="published" defaultValue={p?.published === false ? "off" : "on"} className={inputCls}>
          <option value="on">Shown</option>
          <option value="off">Hidden</option>
        </select>
      </Field>
      <div className="flex items-end">
        <Submit>{p ? "Save" : "Add phrase"}</Submit>
      </div>
    </form>
  );
}
