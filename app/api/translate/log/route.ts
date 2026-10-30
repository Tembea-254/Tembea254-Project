import { handler, json, body } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Anonymous usage stats for the translator (languages and size only — never the text itself). */
export const POST = handler(async (req: Request) => {
  const b = await body(req);
  const me = await currentUser().catch(() => null);
  const db = await getDb();
  await db.insert(schema.translationLogs).values({
    id: newId("tl_"),
    userId: me?.id ?? null,
    fromLang: String(b.from || "?").slice(0, 8),
    toLang: String(b.to || "?").slice(0, 8),
    chars: Math.min(10000, Math.max(0, Number(b.chars) || 0)),
    engine: String(b.engine || "phrasebook").slice(0, 16),
  });
  return json({ ok: true });
});
