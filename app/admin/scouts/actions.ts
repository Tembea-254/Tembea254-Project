"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { notify } from "@/lib/notify";
import { requireAdmin } from "@/lib/session";
import { grantTokens } from "@/lib/tokens";
import type { GigKind, GigStatus } from "@/lib/db/schema";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Math.max(0, Math.round(Number(str(f, k).replace(/[^\d.]/g, "")) || 0));
const back = (tab: string, kind: "ok" | "error", msg: string): never => redirect(`/admin/scouts?tab=${tab}&${kind}=${encodeURIComponent(msg)}`);
const KINDS: GigKind[] = ["record", "record360", "live", "photos"];

/** Post (or edit) a paid job on the Scouts board. */
export async function saveGig(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("gig_");
  const title = str(f, "title", 120);
  if (title.length < 6) back("gigs", "error", "Give the job a clear title.");
  const payKes = num(f, "payKes");
  if (!payKes) back("gigs", "error", "Set what the job pays.");
  const date = (k: string) => {
    const v = str(f, k);
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const values = {
    title,
    kind: (KINDS.includes(str(f, "kind") as GigKind) ? str(f, "kind") : "record") as GigKind,
    destination: str(f, "destination", 60) || "other",
    spot: str(f, "spot", 120),
    brief: str(f, "brief", 1500),
    requirements: str(f, "requirements", 2000)
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 12),
    minMinutes: Math.max(1, num(f, "minMinutes")),
    payKes,
    rewardTokens: num(f, "rewardTokens"),
    slots: Math.max(1, num(f, "slots")),
    scheduledAt: date("scheduledAt"),
    deadline: date("deadline"),
    cover: str(f, "cover", 600).split("\n")[0] || null,
  };
  const db = await getDb();
  await db
    .insert(s.gigs)
    .values({ id, ...values, createdBy: me.id })
    .onConflictDoUpdate({ target: s.gigs.id, set: values });
  await audit(me, "gig.save", id, { title, payKes });
  revalidatePath("/scouts");
  back("gigs", "ok", `"${title}" is on the Scouts board.`);
}

export async function setGigStatus(f: FormData) {
  const me = await requireAdmin();
  const status = str(f, "status") as GigStatus;
  if (!["open", "paused", "closed"].includes(status)) return;
  const db = await getDb();
  await db.update(s.gigs).set({ status }).where(eq(s.gigs.id, str(f, "id")));
  await audit(me, `gig.${status}`, str(f, "id"));
  revalidatePath("/admin/scouts", "layout");
  revalidatePath("/scouts");
}

/** Approve: the scout is owed the job's pay (an approved payout) plus tokens. Reject: a reason is required. */
export async function reviewClaim(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const decision = str(f, "decision");
  const db = await getDb();
  const row = (await db.select({ c: s.gigClaims, g: s.gigs }).from(s.gigClaims).innerJoin(s.gigs, eq(s.gigs.id, s.gigClaims.gigId)).where(eq(s.gigClaims.id, id)))[0];
  if (!row || row.c.status !== "submitted") back("review", "error", "That recording was already reviewed.");
  const { c, g } = row!;

  if (decision === "reject") {
    const reason = [str(f, "reasonPreset", 120), str(f, "reason", 400)].filter(Boolean).join(". ");
    if (!reason) back("review", "error", "Tell the scout why it wasn't approved, so they can fix it.");
    await db.update(s.gigClaims).set({ status: "rejected", reviewerNote: reason, reviewedBy: me.id, reviewedAt: new Date() }).where(eq(s.gigClaims.id, id));
    await notify(c.userId, "scout", `Not approved: ${g.title}. ${reason}`.slice(0, 200), `/scouts/${g.id}`);
    await audit(me, "scout.reject", id, { reason });
    revalidatePath("/scouts");
    back("review", "ok", "Rejected, and the scout has been told why.");
  }

  const scout = (await db.select().from(s.scoutProfiles).where(eq(s.scoutProfiles.userId, c.userId)))[0];
  const payoutId = newId("po_");
  await db.insert(s.payouts).values({ id: payoutId, userId: c.userId, payeeType: "scout", amount: g.payKes, method: "mpesa", destination: scout?.phone ?? "", status: "approved", note: `Scout job: ${g.title}` });
  await db
    .update(s.gigClaims)
    .set({ status: "approved", reviewerNote: str(f, "reason", 400) || null, reviewedBy: me.id, reviewedAt: new Date(), payoutId })
    .where(and(eq(s.gigClaims.id, id), eq(s.gigClaims.status, "submitted")));
  if (g.rewardTokens) await grantTokens(c.userId, g.rewardTokens, `Scout job approved: ${g.title}`, "gig", g.id);
  // The recording becomes Premium VR content: what Premium members pay for, and what lodges can sponsor.
  let published = false;
  if (str(f, "publishVr") === "on" && g.destination && g.kind !== "live" && c.videoUrl) {
    const scout = (await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, c.userId)))[0];
    await db.insert(s.vrScenes).values({
      id: newId("vs_"),
      destinationSlug: g.destination,
      mode: g.kind === "record360" ? "walk" : "view",
      title: g.title,
      spot: g.spot || g.title,
      time: "day",
      source: { kind: "video", src: c.videoUrl },
      minutes: Math.max(1, Math.round((c.durationSec ?? g.minMinutes * 60) / 60)),
      premium: true,
      published: true,
      credit: `Tembea Scout ${scout?.name ?? ""}`.trim(),
      sort: 100,
    });
    published = true;
    revalidatePath("/vr");
  }
  await notify(c.userId, "scout", `Approved! KES ${g.payKes.toLocaleString("en-KE")} for "${g.title}" is on its way to your M-Pesa.`, "/scouts?tab=earnings");
  await audit(me, "scout.approve", id, { payKes: g.payKes, payoutId });
  revalidatePath("/scouts");
  back("review", "ok", `Approved. A KES ${g.payKes.toLocaleString("en-KE")} payout is waiting in Payments & payouts.${published ? " The recording is now a Premium VR scene." : ""}`);
}
