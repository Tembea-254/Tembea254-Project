"use server";

import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { notifyAdmins } from "@/lib/notify";
import { currentUser } from "@/lib/session";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const back = (kind: "ok" | "error", msg: string): never => redirect(`/partners?${kind}=${encodeURIComponent(msg)}#join`);

/** A tour operator, lodge or car-hire business asking to list or advertise. Lands in /admin/partners → Leads. */
export async function partnerEnquiry(f: FormData) {
  if (str(f, "website_confirm")) back("ok", "Thanks! We'll be in touch."); // honeypot for bots
  const company = str(f, "company", 100);
  const email = str(f, "email", 120);
  const phone = str(f, "phone", 30);
  if (company.length < 2) back("error", "Tell us your business name.");
  if (!/^\S+@\S+\.\S+$/.test(email) && phone.length < 9) back("error", "Leave an email or phone number so we can reply.");
  const me = await currentUser().catch(() => null);
  const db = await getDb();
  await db.insert(s.applications).values({
    id: newId("app_"),
    userId: me?.id ?? "guest",
    kind: "partner",
    data: { company, name: str(f, "name", 80), email, phone, website: str(f, "website", 200), kind: str(f, "kind", 20) || "operator", interest: f.getAll("interest").map(String).join(", "), message: str(f, "message", 1000) },
  });
  await notifyAdmins("partner", `New partner enquiry: ${company}`, "/admin/partners?tab=leads");
  back("ok", `Asante, ${company}! Our partnerships team will call you within 2 working days.`);
}
