import { asc, eq } from "drizzle-orm";
import { PHRASES, type Phrase } from "../data/languages";
import { getDb, schema } from "../db";

/** Published phrasebook entries (admins add and edit them in /admin/translator). */
export async function getPhrases(): Promise<Phrase[]> {
  try {
    const db = await getDb();
    const rows = await db.select().from(schema.phrases).where(eq(schema.phrases.published, true)).orderBy(asc(schema.phrases.createdAt));
    if (!rows.length) return PHRASES;
    return rows.map((r) => ({ id: r.id, en: r.english, category: r.category as Phrase["category"], ...r.translations }));
  } catch {
    return PHRASES;
  }
}
