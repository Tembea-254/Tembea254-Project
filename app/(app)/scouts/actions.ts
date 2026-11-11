"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { notifyAdmins } from "@/lib/notify";
import { getScout, takenSlots } from "@/lib/repo/scouts";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const go = (path: string, kind: "ok" | "error", msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const DEVICES = ["phone", "360", "drone", "action"];

/** Onboarding: one short form, then straight to the jobs board. No admin approval needed to start. */
export async function joinScouts(f: FormData) {
  const me = await requireUser();
  const phone = normalizePhone(str(f, "phone"));
  if (!phone) go("/scouts", "error", "Enter the M-Pesa number we should pay you on.");
  if (str(f, "agree") !== "on") go("/scouts", "error", "Please accept the Scout rules to continue.");
  const device = DEVICES.includes(str(f, "device")) ? str(f, "device") : "phone";
  const areas = str(f, "areas", 300)
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);
  const db = await getDb();
  await db
    .insert(s.scoutProfiles)
    .values({ userId: me.id, phone: phone!, county: str(f, "county", 60), device, areas })
    .onConflictDoUpdate({ target: s.scoutProfiles.userId, set: { phone: phone!, county: str(f, "county", 60), device, areas } });
  if (!me.phone) await db.update(s.users).set({ phone }).where(eq(s.users.id, me.id));
  revalidatePath("/scouts");
  go("/scouts", "ok", "Karibu, Scout! Pick a job below to start earning.");
}

/** Reserve a job. Scouts can hold a limited number of unfinished reservations. */
export async function claimGig(f: FormData) {
  const me = await requireUser();
  const gigId = str(f, "gigId");
  const back = `/scouts/${gigId}`;
  if (!(await getScout(me.id))) go("/scouts", "error", "Finish joining first.");
  const db = await getDb();
  const settings = await getSettings();
  const gig = (await db.select().from(s.gigs).where(eq(s.gigs.id, gigId)))[0];
  if (!gig || gig.status !== "open") go("/scouts", "error", "That job is no longer open.");
  if (gig!.deadline && gig!.deadline.getTime() < Date.now()) go(back, "error", "The deadline for this job has passed.");
  const mine = await db.select().from(s.gigClaims).where(eq(s.gigClaims.userId, me.id));
  if (mine.some((c) => c.gigId === gigId && ["claimed", "submitted", "approved", "paid"].includes(c.status))) go(back, "error", "You already have this job.");
  if (mine.filter((c) => c.status === "claimed").length >= settings.scoutMaxOpenClaims)
    go("/scouts?tab=mine", "error", `Finish or release one of your ${settings.scoutMaxOpenClaims} reserved jobs first.`);
  const taken = (await takenSlots([gigId]))[gigId] ?? 0;
  if (taken >= gig!.slots) go(back, "error", "All the spots on this job are taken.");
  await db.insert(s.gigClaims).values({ id: newId("cl_"), gigId, userId: me.id });
  revalidatePath("/scouts");
  go(back, "ok", `Reserved for you for ${settings.scoutClaimHours} hours. Record it and submit before then.`);
}

export async function dropClaim(f: FormData) {
  const me = await requireUser();
  const db = await getDb();
  await db
    .update(s.gigClaims)
    .set({ status: "dropped" })
    .where(and(eq(s.gigClaims.id, str(f, "claimId")), eq(s.gigClaims.userId, me.id), eq(s.gigClaims.status, "claimed")));
  revalidatePath("/scouts");
  go("/scouts?tab=mine", "ok", "Released. Someone else can take it now.");
}

/** Hand in the recording. It goes to the review queue; the scout sees "Pending review". */
export async function submitClaim(f: FormData) {
  const me = await requireUser();
  const claimId = str(f, "claimId");
  const db = await getDb();
  const row = (
    await db
      .select({ c: s.gigClaims, g: s.gigs })
      .from(s.gigClaims)
      .innerJoin(s.gigs, eq(s.gigs.id, s.gigClaims.gigId))
      .where(and(eq(s.gigClaims.id, claimId), eq(s.gigClaims.userId, me.id)))
  )[0];
  if (!row) go("/scouts?tab=mine", "error", "Job not found.");
  const back = `/scouts/${row!.g.id}`;
  if (!["claimed", "rejected"].includes(row!.c.status)) go(back, "error", "This job was already submitted.");
  const videoUrl = (str(f, "videoUrl", 600).split("\n")[0] || str(f, "link", 600)).trim();
  if (!/^(https?:\/\/|\/uploads\/)/.test(videoUrl)) go(back, "error", "Record or upload the video first (or paste a link to it).");
  const durationSec = Math.max(0, Math.round(Number(str(f, "durationSec")) || 0)) || null;
  if (str(f, "confirm") !== "on") go(back, "error", "Please confirm you filmed it yourself, following the checklist.");
  await db
    .update(s.gigClaims)
    .set({ status: "submitted", videoUrl, durationSec, inApp: str(f, "inApp") === "1", note: str(f, "note", 800), submittedAt: new Date(), reviewerNote: null })
    .where(eq(s.gigClaims.id, claimId));
  await notifyAdmins("scout", `New Scout recording to review: ${row!.g.title}`, "/admin/scouts");
  revalidatePath("/scouts");
  go("/scouts?tab=mine", "ok", "Submitted! It's now pending review. We check every recording within 2 working days.");
}
