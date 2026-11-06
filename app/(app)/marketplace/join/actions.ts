"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CREATOR_FILMS, CREATOR_GEAR } from "@/lib/data/creators";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { notifyAdmins } from "@/lib/notify";
import { workspaceAccess } from "@/lib/repo/workspaces";
import { requireUser } from "@/lib/session";

const J = "/marketplace/join/creator";
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const back = (kind: "ok" | "error", msg: string): never => redirect(`${J}?${kind}=${encodeURIComponent(msg)}`);


/** Apply to become a Tembea254 creator. An admin approves it in /admin/approvals; then the Creator studio opens. */
export async function applyCreator(f: FormData) {
  const me = await requireUser();
  const access = await workspaceAccess(me);
  if (access.creator === "approved") redirect("/creators");
  if (access.creator === "pending") back("error", "Your application is already in review.");

  const name = str(f, "name", 80);
  const channel = str(f, "channel", 60);
  const phone = normalizePhone(str(f, "phone"));
  const hub = str(f, "hub", 30);
  const films = f.getAll("films").map(String).filter((x) => CREATOR_FILMS.some((c) => c.id === x));
  const gear = f.getAll("gear").map(String).filter((x) => CREATOR_GEAR.some((c) => c.id === x));
  const links = ["tiktok", "instagram", "youtube", "other"].map((k) => [k, str(f, k, 300)] as const).filter(([, v]) => v);
  const sample = str(f, "sample", 600).split("\n")[0] || str(f, "sampleLink", 600);
  const about = str(f, "about", 1200);
  const droneLicence = str(f, "droneLicence", 40);

  if (name.length < 3) back("error", "Enter your full name.");
  if (!phone) back("error", "Enter a valid Safaricom number — creator payments go to M-Pesa.");
  if (!films.length) back("error", "Tell us what you film (pick at least one).");
  if (!gear.length) back("error", "Tell us what you film with.");
  if (!links.length && !sample) back("error", "Add a link to your work or a sample video so we can see your style.");
  if (links.some(([, v]) => !/^https?:\/\//.test(v)) || (sample && !/^(https?:\/\/|\/uploads\/)/.test(sample))) back("error", "Links must start with https://");
  if (about.length < 30) back("error", "Tell us a little about yourself (at least 30 characters).");
  if (gear.includes("drone") && !droneLicence) back("error", "Drone pilots need a KCAA remote pilot licence number.");
  if (str(f, "agree") !== "on") back("error", "Please accept the creator terms.");

  const db = await getDb();
  // a rejected application is replaced by the new one
  await db.delete(s.applications).where(and(eq(s.applications.userId, me.id), eq(s.applications.kind, "creator"), eq(s.applications.status, "rejected")));
  await db.insert(s.applications).values({
    id: newId("app_"),
    userId: me.id,
    kind: "creator",
    data: { name, channel, phone, hub, films, gear, links: Object.fromEntries(links), sample: sample || null, about, droneLicence: droneLicence || null },
  });
  if (!me.phone) await db.update(s.users).set({ phone }).where(eq(s.users.id, me.id));
  await notifyAdmins("application", `New creator application: ${channel || name}`, "/admin/approvals?tab=creators");
  revalidatePath("/", "layout");
  back("ok", "Application sent. We review creators within 2 working days — your Creator studio appears in the sidebar once you're approved.");
}
