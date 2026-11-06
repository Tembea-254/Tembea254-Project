import { getDb, schema } from "./db";
import { DEFAULT_SETTINGS, type Settings } from "./db/settings-defaults";

/** Current business settings (defaults merged with what admins saved). */
export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows) if (r.key in out) out[r.key] = r.value;
  return out as Settings;
}

export async function saveSettings(patch: Partial<Settings>) {
  const db = await getDb();
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await db
      .insert(schema.settings)
      .values({ key, value: value as never })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: value as never, updatedAt: new Date() } });
  }
}

const SERVICE_IDS = ["drivers", "guides", "photographers", "artists", "experiences"];

export function commissionFor(settings: Settings, category: string, vendorRate?: number | null) {
  if (vendorRate != null) return vendorRate;
  if (SERVICE_IDS.includes(category)) return settings.commissionServices ?? settings.commissionDefault;
  return settings.commissionByCategory[category] ?? settings.commissionDefault;
}
