"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/db/settings-defaults";
import { settlePayment } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { getSettings, saveSettings } from "@/lib/settings";
import { grantTokens } from "@/lib/tokens";
import { notify, track } from "@/lib/notify";

/* Every action checks the admin role, records an activity-log entry and refreshes the page. */

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(v) ? v : 0;
};
const done = (path: string) => revalidatePath(path, "layout");

/* ------------------------------ Users ------------------------------ */

export async function setUserRole(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const role = str(f, "role") === "admin" ? "admin" : "user";
  if (id === me.id && role !== "admin") throw new Error("You can't remove your own admin role.");
  const db = await getDb();
  await db.update(s.users).set({ role }).where(eq(s.users.id, id));
  await audit(me, `user.role.${role}`, id);
  done("/admin/users");
}

export async function setUserStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") === "suspended" ? "suspended" : "active";
  if (id === me.id) throw new Error("You can't suspend yourself.");
  const db = await getDb();
  await db.update(s.users).set({ status }).where(eq(s.users.id, id));
  await audit(me, `user.${status}`, id);
  done("/admin/users");
}

export async function adjustUserTokens(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const amount = Math.round(num(f, "amount"));
  const reason = str(f, "reason", 120) || "Adjusted by admin";
  await grantTokens(id, amount, reason, "admin", me.id);
  const credits = str(f, "credits");
  if (credits) {
    const db = await getDb();
    await db.update(s.users).set({ credits: Math.max(0, Math.round(Number(credits))) }).where(eq(s.users.id, id));
  }
  await audit(me, "user.tokens", id, { amount, reason, credits });
  done("/admin/users");
}

/* ------------------------------ Trips ------------------------------ */

export async function deleteTrip(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.delete(s.trips).where(eq(s.trips.id, id));
  await audit(me, "trip.delete", id);
  done("/admin/trips");
  if (str(f, "back")) redirect("/admin/trips");
}

/* --------------------------- Virtual pre-visits --------------------------- */

export async function setDestinationPublished(f: FormData) {
  const me = await requireAdmin();
  const slug = str(f, "slug");
  const published = str(f, "published") === "true";
  const db = await getDb();
  await db.update(s.vrDestinations).set({ published, updatedAt: new Date() }).where(eq(s.vrDestinations.slug, slug));
  await audit(me, published ? "vr.destination.publish" : "vr.destination.hide", slug);
  done("/admin/vr");
}

export async function updateDestination(f: FormData) {
  const me = await requireAdmin();
  const slug = str(f, "slug");
  const db = await getDb();
  const row = (await db.select().from(s.vrDestinations).where(eq(s.vrDestinations.slug, slug)))[0];
  if (!row) return;
  const data = { ...(row.data as Record<string, unknown>), tagline: str(f, "tagline", 200), description: str(f, "description", 1200), bestTime: str(f, "bestTime", 120), cover: str(f, "cover", 600) || (row.data as { cover?: string }).cover };
  await db.update(s.vrDestinations).set({ name: str(f, "name", 80) || row.name, region: str(f, "region", 80), data, updatedAt: new Date() }).where(eq(s.vrDestinations.slug, slug));
  await audit(me, "vr.destination.update", slug);
  done(`/admin/vr/${slug}`);
}

function parseSource(kind: string, value: string, start: number) {
  if (kind === "youtube") {
    const m = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/) || value.match(/^([\w-]{11})$/);
    if (!m) throw new Error("Paste a YouTube link or 11-character video ID.");
    return { kind: "youtube", id: m[1], start: start || undefined };
  }
  if (!/^(https?:\/\/|\/uploads\/)/.test(value)) throw new Error("Upload a file or paste a full video/photo URL.");
  return { kind: kind === "photo" ? "photo" : "video", src: value };
}

export async function addScene(f: FormData) {
  const me = await requireAdmin();
  const slug = str(f, "slug");
  const db = await getDb();
  const source = parseSource(str(f, "kind"), str(f, "value", 600) || str(f, "upload", 600), Math.round(num(f, "start")));
  const id = newId("sc_");
  const max = await db.select({ n: sql<number>`coalesce(max(${s.vrScenes.sort}), 0)::int` }).from(s.vrScenes).where(eq(s.vrScenes.destinationSlug, slug));
  await db.insert(s.vrScenes).values({
    id,
    destinationSlug: slug,
    mode: str(f, "mode") || "walk",
    title: str(f, "title", 120) || "New scene",
    spot: str(f, "spot", 60) || "Spot",
    time: str(f, "time") === "night" ? "night" : "day",
    source,
    minutes: Math.max(1, Math.round(num(f, "minutes")) || 1),
    premium: str(f, "premium") === "on",
    credit: str(f, "credit", 80),
    submissionId: str(f, "submissionId") || null,
    sort: max[0].n + 1,
  });
  await audit(me, "vr.scene.add", id, { slug });
  done(`/admin/vr/${slug}`);
}

export async function updateScene(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  const patch: Partial<typeof s.vrScenes.$inferInsert> = {};
  if (f.has("mode")) patch.mode = str(f, "mode");
  if (f.has("title")) patch.title = str(f, "title", 120);
  if (f.has("spot")) patch.spot = str(f, "spot", 60);
  if (f.has("time")) patch.time = str(f, "time") === "night" ? "night" : "day";
  if (f.has("published")) patch.published = str(f, "published") === "true";
  if (f.has("premium")) patch.premium = str(f, "premium") === "true";
  if (f.has("sort")) patch.sort = Math.round(num(f, "sort"));
  await db.update(s.vrScenes).set(patch).where(eq(s.vrScenes.id, id));
  await audit(me, "vr.scene.update", id, patch);
  done("/admin/vr");
}

export async function deleteScene(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.delete(s.vrScenes).where(eq(s.vrScenes.id, id));
  await audit(me, "vr.scene.delete", id);
  done("/admin/vr");
}

/* ------------------------- Creators & live walks ------------------------- */

export async function reviewSubmission(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const decision = str(f, "decision");
  const db = await getDb();
  const sub = (await db.select().from(s.videoSubmissions).where(eq(s.videoSubmissions.id, id)))[0];
  if (!sub) return;
  const note = str(f, "note", 600) || sub.reviewerNote;
  if (decision === "in_review") {
    await db.update(s.videoSubmissions).set({ status: "in_review", reviewerNote: note, reviewedBy: me.id, updatedAt: new Date() }).where(eq(s.videoSubmissions.id, id));
  } else if (decision === "reject") {
    await db.update(s.videoSubmissions).set({ status: "rejected", reviewerNote: note || "Doesn't meet our quality bar this time.", reviewedBy: me.id, updatedAt: new Date() }).where(eq(s.videoSubmissions.id, id));
  } else if (decision === "approve" || decision === "purchase") {
    const offer = Math.max(0, Math.round(num(f, "offer"))) || sub.offerAmount || sub.askingPrice;
    const tokens = Math.max(0, Math.round(num(f, "tokens")));
    await db
      .update(s.videoSubmissions)
      .set({ status: decision === "purchase" ? "purchased" : "approved", offerAmount: offer, rewardTokens: tokens || sub.rewardTokens, reviewerNote: note, reviewedBy: me.id, updatedAt: new Date() })
      .where(eq(s.videoSubmissions.id, id));
    if (decision === "purchase" && sub.status !== "purchased") {
      const owner = (await db.select().from(s.users).where(eq(s.users.id, sub.userId)))[0];
      if (offer > 0) await db.insert(s.payouts).values({ id: newId("po_"), userId: sub.userId, payeeType: "creator", amount: offer, method: "mpesa", destination: owner?.phone ?? "", note: `Video purchase: ${sub.title}` });
      if (tokens) await grantTokens(sub.userId, tokens, `Video bought by Tembea: ${sub.title}`, "submission", id);
    }
  }
  await audit(me, `creator.submission.${decision}`, id);
  done("/admin/creators");
}

export async function publishSubmissionToVr(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  const sub = (await db.select().from(s.videoSubmissions).where(eq(s.videoSubmissions.id, id)))[0];
  if (!sub) return;
  const slug = str(f, "destination") || sub.destination;
  const dest = (await db.select().from(s.vrDestinations).where(eq(s.vrDestinations.slug, slug)))[0];
  if (!dest) throw new Error("Pick a VR destination first.");
  const owner = (await db.select().from(s.users).where(eq(s.users.id, sub.userId)))[0];
  const yt = sub.videoUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  await db.insert(s.vrScenes).values({
    id: newId("sc_"),
    destinationSlug: slug,
    mode: ["fly", "walk", "drive", "view"].includes(sub.mode) ? sub.mode : "drive",
    title: sub.title,
    spot: sub.location || sub.title.slice(0, 40),
    source: yt ? { kind: "youtube", id: yt[1] } : { kind: sub.is360 ? "video" : "video", src: sub.videoUrl },
    minutes: Math.max(1, Math.round((sub.durationSec ?? 60) / 60)),
    credit: owner?.name || "Tembea creator",
    submissionId: sub.id,
    sort: 999,
  });
  await audit(me, "creator.submission.publish_vr", id, { slug });
  done("/admin/creators");
}

export async function setLiveStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as typeof s.liveSessions.$inferSelect.status;
  const db = await getDb();
  const live = (await db.select().from(s.liveSessions).where(eq(s.liveSessions.id, id)))[0];
  if (!live) return;
  const patch: Partial<typeof s.liveSessions.$inferInsert> = { status };
  if (f.has("streamUrl")) patch.streamUrl = str(f, "streamUrl", 600) || null;
  if (status === "ended" && live.status !== "ended") {
    const tokens = Math.round(num(f, "tokens"));
    if (tokens > 0) {
      patch.rewardTokens = tokens;
      await grantTokens(live.hostUserId, tokens, `Hosted live walk: ${live.title}`, "live", id);
    }
  }
  await db.update(s.liveSessions).set(patch).where(eq(s.liveSessions.id, id));
  await audit(me, `live.${status}`, id);
  done("/admin/creators");
}

/* ------------------------------ Shop ------------------------------ */

export async function setVendorStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as "pending" | "verified" | "suspended" | "rejected";
  const db = await getDb();
  await db
    .update(s.vendors)
    .set({ status, ...(f.has("note") ? { note: str(f, "note", 400) || null } : {}), ...(status === "verified" ? { verifiedAt: new Date() } : {}) })
    .where(eq(s.vendors.id, id));
  if (status === "suspended") await db.update(s.products).set({ status: "hidden" }).where(and(eq(s.products.vendorId, id), eq(s.products.status, "active")));
  const v = (await db.select({ userId: s.vendors.userId, storeName: s.vendors.storeName }).from(s.vendors).where(eq(s.vendors.id, id)))[0];
  if (v) {
    const msg: Record<string, [string, string]> = {
      verified: [`You're approved! ${v.storeName} is verified — your Seller centre is now in your sidebar.`, "/vendor"],
      rejected: [`We couldn't approve ${v.storeName} yet. See the note and send your application again.`, "/marketplace/join/seller"],
      suspended: [`${v.storeName} has been paused. Check the note in your Seller centre.`, "/vendor"],
    };
    if (msg[status]) await notify(v.userId, "application", msg[status][0], msg[status][1], me.id);
  }
  await audit(me, `vendor.${status}`, id);
  done("/admin/shop");
  done("/admin/approvals");
}

export async function setVendorCommission(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const raw = str(f, "rate");
  const rate = raw === "" ? null : Math.min(0.5, Math.max(0, Number(raw) / 100));
  const db = await getDb();
  await db.update(s.vendors).set({ commissionRate: rate }).where(eq(s.vendors.id, id));
  await audit(me, "vendor.commission", id, { rate });
  done("/admin/shop");
}

export async function setProductStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as "active" | "rejected" | "hidden" | "pending";
  const db = await getDb();
  await db.update(s.products).set({ status, rejectReason: status === "rejected" ? str(f, "reason", 300) || "Doesn't meet listing guidelines" : null, updatedAt: new Date() }).where(eq(s.products.id, id));
  await audit(me, `product.${status}`, id);
  done("/admin/shop");
  done("/admin/approvals");
}

/** Jumia-style policy strike (fake goods, no-show, very late shipping). Too many suspends the store. */
export async function addVendorStrike(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const reason = str(f, "reason", 300) || "Policy breach";
  const db = await getDb();
  const settings = await getSettings();
  const v = (await db.select().from(s.vendors).where(eq(s.vendors.id, id)))[0];
  if (!v) return;
  const strikes = v.strikes + 1;
  const suspend = strikes >= settings.strikesToSuspend;
  await db
    .update(s.vendors)
    .set({ strikes, note: reason, ...(suspend ? { status: "suspended" as const } : {}) })
    .where(eq(s.vendors.id, id));
  if (suspend) await db.update(s.products).set({ status: "hidden" }).where(and(eq(s.products.vendorId, id), eq(s.products.status, "active")));
  await notify(v.userId, "strike", suspend ? `Your store is suspended after ${strikes} strikes: ${reason}` : `Strike ${strikes} of ${settings.strikesToSuspend}: ${reason}`, "/vendor");
  await audit(me, suspend ? "vendor.strike.suspended" : "vendor.strike", id, { reason, strikes });
  done("/admin/shop");
}

export async function clearVendorStrikes(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.update(s.vendors).set({ strikes: 0 }).where(eq(s.vendors.id, id));
  await audit(me, "vendor.strikes.cleared", id);
  done("/admin/shop");
}

export async function toggleFeatured(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const kind = str(f, "kind");
  const on = str(f, "on") === "true";
  const db = await getDb();
  if (kind === "vendor") await db.update(s.vendors).set({ featured: on }).where(eq(s.vendors.id, id));
  else await db.update(s.products).set({ featured: on }).where(eq(s.products.id, id));
  await audit(me, `${kind}.featured.${on}`, id);
  done("/admin/shop");
}

/** Approve or reject a buyer's return. Approved returns are taken out of the seller's balance; mark refunded once M-Pesa is sent back. */
export async function decideReturn(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "item");
  const decision = str(f, "decision") as "approved" | "rejected" | "refunded";
  const db = await getDb();
  const it = (await db.select().from(s.orderItems).where(eq(s.orderItems.id, id)))[0];
  if (!it || !["approved", "rejected", "refunded"].includes(decision)) return;
  await db.update(s.orderItems).set({ returnStatus: decision }).where(eq(s.orderItems.id, id));
  const o = (await db.select().from(s.orders).where(eq(s.orders.id, it.orderId)))[0];
  await track(it.orderId, "return", decision === "approved" ? "Return approved" : decision === "refunded" ? "Refund sent" : "Return declined", it.title);
  await notify(o?.userId, "order", decision === "approved" ? `Your return of ${it.title} was approved — send it back via any pick-up station` : decision === "refunded" ? `Refund sent for ${it.title}` : `Your return of ${it.title} was declined`, `/orders/${it.orderId}`);
  await audit(me, `return.${decision}`, id);
  done("/admin/shop");
}

/** Add a tracking step by hand (courier scans, arrival at a pick-up station…). */
export async function addTrackingEvent(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status", 30) || "in_transit";
  const titles: Record<string, string> = { in_transit: "On the way", ready: "Ready at the pick-up station", out: "Out for delivery", delivered: "Delivered", delayed: "Delayed" };
  const db = await getDb();
  const o = (await db.select().from(s.orders).where(eq(s.orders.id, id)))[0];
  if (!o) return;
  await track(id, status, titles[status] ?? status, str(f, "note", 200), str(f, "location", 80));
  if (status === "delivered") {
    await db.update(s.orderItems).set({ fulfilment: "delivered", updatedAt: new Date() }).where(and(eq(s.orderItems.orderId, id), sql`${s.orderItems.fulfilment} <> 'cancelled'`));
    await db.update(s.orders).set({ status: "delivered" }).where(eq(s.orders.id, id));
  }
  await notify(o.userId, "order", `${titles[status] ?? status}${str(f, "location") ? ` — ${str(f, "location")}` : ""}`, `/orders/${id}`);
  await audit(me, `order.track.${status}`, id);
  done("/admin/shop");
}

export async function setOrderStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as typeof s.orders.$inferSelect.status;
  const db = await getDb();
  await db.update(s.orders).set({ status }).where(eq(s.orders.id, id));
  if (status === "cancelled" || status === "refunded") await db.update(s.orderItems).set({ fulfilment: "cancelled", updatedAt: new Date() }).where(eq(s.orderItems.orderId, id));
  if (status === "delivered") await db.update(s.orderItems).set({ fulfilment: "delivered", updatedAt: new Date() }).where(eq(s.orderItems.orderId, id));
  await audit(me, `order.${status}`, id);
  done("/admin/shop");
}

/* --------------------------- Hire marketplace --------------------------- */

export async function setProviderStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status");
  const db = await getDb();
  const patch: Partial<typeof s.providers.$inferInsert> = { status };
  if (f.has("rate")) patch.rate = Math.max(0, Math.round(num(f, "rate")));
  await db.update(s.providers).set(patch).where(eq(s.providers.id, id));
  await audit(me, `provider.${status}`, id);
  done("/admin/marketplace");
}

export async function decideApplication(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const approve = str(f, "decision") === "approve";
  const db = await getDb();
  const app = (await db.select().from(s.applications).where(eq(s.applications.id, id)))[0];
  if (!app) return;
  await db.update(s.applications).set({ status: approve ? "approved" : "rejected", note: str(f, "note", 400) || null, reviewedBy: me.id }).where(eq(s.applications.id, id));
  if (approve && app.kind === "provider") {
    const d = app.data as { business: string; phone: string; about: string; hub: string; category: string };
    await db.insert(s.providers).values({
      id: newId("pr_"),
      userId: app.userId,
      hub: d.hub,
      category: d.category,
      name: d.business,
      headline: d.about.slice(0, 120),
      about: d.about,
      rate: Math.max(0, Math.round(num(f, "rate"))) || 5000,
      unit: str(f, "unit") || "per day",
      checks: ["National ID"],
      status: "active",
    });
  }
  if (app.kind === "creator")
    await notify(
      app.userId,
      "application",
      approve ? "You're approved as a Tembea254 creator! Your Creator studio is now in your sidebar." : "We couldn't approve your creator application yet. See the note and send it again.",
      approve ? "/creators" : "/marketplace/join/creator",
      me.id,
    );
  await audit(me, `application.${app.kind}.${approve ? "approve" : "reject"}`, id);
  done("/admin/marketplace");
  done("/admin/approvals");
}

export async function setHireStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status");
  const db = await getDb();
  await db.update(s.hires).set({ status }).where(eq(s.hires.id, id));
  await audit(me, `hire.${status}`, id);
  done("/admin/marketplace");
}

/* ------------------------------ Money ------------------------------ */

export async function decidePayout(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as "approved" | "paid" | "rejected";
  const db = await getDb();
  await db
    .update(s.payouts)
    .set({ status, reference: str(f, "reference", 80) || null, note: str(f, "note", 300) || null, processedAt: status === "approved" ? null : new Date() })
    .where(eq(s.payouts.id, id));
  await audit(me, `payout.${status}`, id, { reference: str(f, "reference") });
  done("/admin/payments");
}

export async function markPayment(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const ok = str(f, "ok") === "true";
  await settlePayment(id, ok, ok ? "Confirmed manually by admin" : "Marked failed by admin", str(f, "receipt", 40) || undefined);
  await audit(me, ok ? "payment.mark_paid" : "payment.mark_failed", id);
  done("/admin/payments");
}

/* ------------------------------ Community ------------------------------ */

export async function setPostStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as "visible" | "hidden" | "removed";
  const db = await getDb();
  await db.update(s.posts).set({ status }).where(eq(s.posts.id, id));
  await audit(me, `post.${status}`, id);
  done("/admin/community");
}

export async function setCommentStatus(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const status = str(f, "status") as "visible" | "hidden" | "removed";
  const db = await getDb();
  await db.update(s.comments).set({ status }).where(eq(s.comments.id, id));
  await audit(me, `comment.${status}`, id);
  done("/admin/community");
}

export async function resolveReport(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const action = str(f, "action");
  const db = await getDb();
  const rep = (await db.select().from(s.reports).where(eq(s.reports.id, id)))[0];
  if (!rep) return;
  if (action === "hide" && rep.targetType === "post") await db.update(s.posts).set({ status: "hidden" }).where(eq(s.posts.id, rep.targetId));
  await db.update(s.reports).set({ status: action === "dismiss" ? "dismissed" : "resolved" }).where(eq(s.reports.id, id));
  await audit(me, `report.${action}`, id);
  done("/admin/community");
}

/* ------------------------------ Reviews ------------------------------ */

export async function decideReview(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const approve = str(f, "decision") === "approve";
  const db = await getDb();
  const r = (await db.select().from(s.reviews).where(eq(s.reviews.id, id)))[0];
  if (!r) return;
  let rewarded = r.rewarded;
  if (approve && !r.rewarded && r.userId) {
    const tokens = Math.round(num(f, "tokens"));
    if (tokens > 0) {
      await grantTokens(r.userId, tokens, "Approved review", "review", id);
      rewarded = true;
    }
  }
  await db.update(s.reviews).set({ status: approve ? "approved" : "rejected", rewarded }).where(eq(s.reviews.id, id));
  await audit(me, `review.${approve ? "approve" : "reject"}`, id);
  done("/admin/reviews");
}

/* ------------------------------ Blog ------------------------------ */

/** Body format: "## Heading" starts a section, "- tip" adds a tip, blank lines separate paragraphs. */
function parseBody(text: string) {
  const sections: { heading?: string; paragraphs: string[]; tips?: string[] }[] = [];
  let cur: (typeof sections)[number] = { paragraphs: [] };
  const flush = () => {
    if (cur.heading || cur.paragraphs.length || cur.tips?.length) sections.push(cur);
  };
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        cur = { heading: line.slice(3).trim(), paragraphs: [] };
      } else if (/^[-*] /.test(line)) {
        (cur.tips ??= []).push(line.slice(2).trim());
      } else {
        cur.paragraphs.push(line);
      }
    }
  }
  flush();
  return sections;
}

export async function saveBlogPost(f: FormData) {
  const me = await requireAdmin();
  const original = str(f, "original");
  const title = str(f, "title", 160);
  if (!title) throw new Error("Add a title.");
  const slug = (str(f, "slug", 90) || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const body = str(f, "body", 40000);
  const sections = parseBody(body);
  const words = body.split(/\s+/).length;
  const relLabel = str(f, "relatedLabel", 80);
  const relHref = str(f, "relatedHref", 200);
  const values = {
    title,
    excerpt: str(f, "excerpt", 300),
    category: str(f, "category") || "Guides",
    cover: str(f, "cover", 600) || str(f, "coverUpload", 600),
    author: str(f, "author", 80) || "Tembea254 Team",
    readMins: Math.max(1, Math.round(words / 200)),
    sections,
    related: relLabel && relHref ? { label: relLabel, href: relHref } : null,
    status: str(f, "status") === "draft" ? "draft" : "published",
    publishedAt: str(f, "publishedAt") || new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
  };
  const db = await getDb();
  if (original && original !== slug) await db.delete(s.blogPosts).where(eq(s.blogPosts.slug, original));
  await db.insert(s.blogPosts).values({ slug, ...values }).onConflictDoUpdate({ target: s.blogPosts.slug, set: values });
  await audit(me, original ? "blog.update" : "blog.create", slug);
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  done("/admin/blog");
  redirect("/admin/blog");
}

export async function deleteBlogPost(f: FormData) {
  const me = await requireAdmin();
  const slug = str(f, "slug");
  const db = await getDb();
  await db.delete(s.blogPosts).where(eq(s.blogPosts.slug, slug));
  await audit(me, "blog.delete", slug);
  revalidatePath("/blog");
  done("/admin/blog");
}

/* ------------------------------ Translator ------------------------------ */

export async function savePhrase(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("ph_");
  const english = str(f, "english", 200);
  if (!english) throw new Error("Add the English phrase.");
  const translations: Record<string, string> = {};
  for (const lang of ["sw", "ki", "luo", "mas", "kln", "kam", "luy", "som"]) {
    const v = str(f, lang, 200);
    if (v) translations[lang] = v;
  }
  const values = { category: str(f, "category") || "Greetings", english, translations, published: str(f, "published") !== "off" };
  const db = await getDb();
  await db.insert(s.phrases).values({ id, ...values }).onConflictDoUpdate({ target: s.phrases.id, set: values });
  await audit(me, "phrase.save", id);
  done("/admin/translator");
}

export async function deletePhrase(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.delete(s.phrases).where(eq(s.phrases.id, id));
  await audit(me, "phrase.delete", id);
  done("/admin/translator");
}

/* ------------------------------ Safety ------------------------------ */

export async function saveAlert(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("al_");
  const values = { title: str(f, "title", 120), body: str(f, "body", 1000), level: ["info", "warning", "critical"].includes(str(f, "level")) ? str(f, "level") : "info", region: str(f, "region", 80) || "All Kenya", active: str(f, "active") !== "off" };
  if (!values.title || !values.body) throw new Error("Add a title and message.");
  const db = await getDb();
  await db.insert(s.safetyAlerts).values({ id, ...values }).onConflictDoUpdate({ target: s.safetyAlerts.id, set: values });
  await audit(me, "alert.save", id);
  revalidatePath("/safety");
  done("/admin/safety");
}

export async function toggleAlert(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.update(s.safetyAlerts).set({ active: str(f, "active") === "true" }).where(eq(s.safetyAlerts.id, id));
  await audit(me, "alert.toggle", id);
  revalidatePath("/safety");
  done("/admin/safety");
}

export async function deleteAlert(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const db = await getDb();
  await db.delete(s.safetyAlerts).where(eq(s.safetyAlerts.id, id));
  await audit(me, "alert.delete", id);
  revalidatePath("/safety");
  done("/admin/safety");
}

/* ------------------------------ Settings ------------------------------ */

export async function saveSettingsForm(f: FormData) {
  const me = await requireAdmin();
  const pct = (k: string) => Math.min(0.5, Math.max(0, num(f, k) / 100));
  const byCat: Record<string, number> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS.commissionByCategory)) byCat[k] = pct(`cat_${k}`);
  const patch: Partial<Settings> = {
    commissionDefault: pct("commissionDefault"),
    commissionByCategory: byCat,
    deliveryFeeKes: Math.max(0, Math.round(num(f, "deliveryFeeKes"))),
    deliveryNairobiKes: Math.max(0, Math.round(num(f, "deliveryNairobiKes"))),
    pickupFeeKes: Math.max(0, Math.round(num(f, "pickupFeeKes"))),
    commissionServices: pct("commissionServices"),
    returnWindowDays: Math.max(0, Math.round(num(f, "returnWindowDays"))),
    strikesToSuspend: Math.max(1, Math.round(num(f, "strikesToSuspend"))),
    freeDeliveryOverKes: Math.max(0, Math.round(num(f, "freeDeliveryOverKes"))),
    hireDepositRate: pct("hireDepositRate"),
    productApproval: str(f, "productApproval") === "on",
    minPayoutKes: Math.max(0, Math.round(num(f, "minPayoutKes"))),
    rewardTokensPerReview: Math.max(0, Math.round(num(f, "rewardTokensPerReview"))),
    rewardTokensPerApprovedVideo: Math.max(0, Math.round(num(f, "rewardTokensPerApprovedVideo"))),
    rewardTokensPerLiveWalk: Math.max(0, Math.round(num(f, "rewardTokensPerLiveWalk"))),
    tokenValueKes: Math.max(0, num(f, "tokenValueKes")),
    plannerFreeCredits: Math.max(0, Math.round(num(f, "plannerFreeCredits"))),
    maintenanceBanner: str(f, "maintenanceBanner", 300),
  };
  await saveSettings(patch);
  await audit(me, "settings.save", undefined, patch as Record<string, unknown>);
  done("/admin/settings");
}
