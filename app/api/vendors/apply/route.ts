import { body, handler, json } from "@/lib/api";
import { HIRE_CATEGORIES, HUBS } from "@/lib/data/market";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Applications to be listed as a hire provider (driver, guide, photographer, artist). Reviewed in /admin. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const b = await body<Record<string, string>>(req);
  const business = String(b.business || "").trim().slice(0, 80);
  const phone = String(b.phone || "").replace(/[^\d+ ]/g, "").slice(0, 20);
  const about = String(b.about || "").trim().slice(0, 800);
  if (business.length < 2 || phone.replace(/\D/g, "").length < 9 || about.length < 20) throw new HttpError(400, "Add your business name, a phone number and a short description (20+ characters).");
  const db = await getDb();
  await db.insert(schema.applications).values({
    id: newId("app_"),
    userId: user.id,
    kind: "provider",
    data: { business, phone, about, hub: HUBS.some((h) => h.id === b.hub) ? b.hub : "other", category: HIRE_CATEGORIES.includes(b.category as never) ? b.category : "Other" },
  });
  return json({ ok: true });
});
