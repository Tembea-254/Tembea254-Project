import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function activeAlerts() {
  try {
    const db = await getDb();
    return await db.select().from(schema.safetyAlerts).where(eq(schema.safetyAlerts.active, true)).orderBy(desc(schema.safetyAlerts.createdAt)).limit(20);
  } catch {
    return [];
  }
}
