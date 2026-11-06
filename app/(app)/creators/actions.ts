"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { canCreate, workspaceAccess } from "@/lib/repo/workspaces";
import { requireUser } from "@/lib/session";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const back = (tab: string, kind: "ok" | "error", msg: string): never => redirect(`/creators?tab=${tab}&${kind}=${encodeURIComponent(msg)}`);
const MODES = ["fly", "walk", "drive", "water", "view"];

/** Only approved creators (and admins) can sell videos or host live walks. */
async function requireCreator() {
  const me = await requireUser();
  if (!canCreate(await workspaceAccess(me))) redirect("/marketplace/join/creator");
  return me;
}

/** Offer a video to Tembea. The team reviews quality, then buys it (cash, tokens or both) for the 360° pre-visits. */
export async function submitVideo(f: FormData) {
  const me = await requireCreator();
  const title = str(f, "title", 100);
  const videoUrl = str(f, "videoUrl", 600).split("\n")[0] || str(f, "link", 600);
  const destination = str(f, "destination", 60);
  const mode = str(f, "mode");
  if (title.length < 4) back("submit", "error", "Give your video a title.");
  if (!/^(https?:\/\/|\/uploads\/)/.test(videoUrl)) back("submit", "error", "Upload the video file or paste a YouTube / Drive link.");
  if (!destination) back("submit", "error", "Where was it filmed?");
  if (!MODES.includes(mode)) back("submit", "error", "Choose how it was filmed.");
  if (str(f, "rights") !== "on") back("submit", "error", "Please confirm you filmed it and own the rights.");
  const phone = normalizePhone(str(f, "phone"));
  const db = await getDb();
  if (phone && !me.phone) await db.update(s.users).set({ phone }).where(eq(s.users.id, me.id));
  await db.insert(s.videoSubmissions).values({
    id: newId("sub_"),
    userId: me.id,
    title,
    description: str(f, "description", 1500),
    destination,
    location: str(f, "location", 80),
    mode,
    videoUrl,
    is360: str(f, "is360") === "on",
    resolution: str(f, "resolution", 10),
    durationSec: Math.max(0, Math.round(Number(str(f, "minutes")) * 60)) || null,
    askingPrice: Math.max(0, Math.round(Number(str(f, "askingPrice")) || 0)),
  });
  revalidatePath("/creators");
  back("videos", "ok", "Sent! Our team reviews every video within 3 working days.");
}

export async function withdrawSubmission(f: FormData) {
  const me = await requireUser();
  const db = await getDb();
  await db.delete(s.videoSubmissions).where(and(eq(s.videoSubmissions.id, str(f, "id")), eq(s.videoSubmissions.userId, me.id), eq(s.videoSubmissions.status, "submitted")));
  revalidatePath("/creators");
  back("videos", "ok", "Withdrawn.");
}

/** Volunteer to host a live virtual walk; an admin approves and schedules it. */
export async function proposeLive(f: FormData) {
  const me = await requireCreator();
  const title = str(f, "title", 100);
  const at = new Date(str(f, "when"));
  if (title.length < 4) back("live", "error", "Give your live walk a title.");
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 3600_000) back("live", "error", "Pick a date and time at least an hour from now.");
  const db = await getDb();
  await db.insert(s.liveSessions).values({
    id: newId("live_"),
    hostUserId: me.id,
    title,
    destination: str(f, "destination", 60),
    mode: MODES.includes(str(f, "mode")) ? str(f, "mode") : "walk",
    scheduledAt: at,
    durationMin: Math.min(180, Math.max(10, Math.round(Number(str(f, "duration")) || 30))),
    streamUrl: str(f, "streamUrl", 600) || null,
    notes: str(f, "notes", 800),
  });
  revalidatePath("/creators");
  back("live", "ok", "Proposed. We'll confirm the slot and it will appear on the virtual pre-visit page.");
}

export async function cancelLive(f: FormData) {
  const me = await requireUser();
  const db = await getDb();
  await db
    .update(s.liveSessions)
    .set({ status: "cancelled" })
    .where(and(eq(s.liveSessions.id, str(f, "id")), eq(s.liveSessions.hostUserId, me.id)));
  revalidatePath("/creators");
  back("live", "ok", "Cancelled.");
}
