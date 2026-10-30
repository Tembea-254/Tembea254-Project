"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SERVICE_TYPE_BY_ID, SERVICE_UNITS, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { notify, notifyAdmins, track } from "@/lib/notify";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizePhone } from "@/lib/mpesa";
import { syncOrderStatus } from "@/lib/orders";
import { myVendor, vendorBalance } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => Math.max(0, Math.round(Number(String(f.get(k) ?? "").replace(/[^\d.]/g, "")) || 0));
const back = (path: string, kind: "ok" | "error", msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "store";

async function vendorOrFail() {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "pending" || v.status === "rejected") redirect(J);
  return { me, v };
}

/** Open a store: creates a pending vendor that an admin then verifies. */
const J = "/marketplace/join/seller";

export async function applyVendor(f: FormData) {
  const me = await requireUser();
  const db = await getDb();
  const existing = await myVendor(me.id);
  if (existing && existing.status !== "rejected") back(existing.status === "pending" ? J : "/vendor", "error", existing.status === "pending" ? "Your application is already in review." : "You already have a store.");
  const storeName = str(f, "storeName", 60);
  const phone = normalizePhone(str(f, "phone")) ?? "";
  const sellerType = ["maker", "pro", "both"].includes(str(f, "sellerType")) ? str(f, "sellerType") : "maker";
  const categories = f.getAll("categories").map(String).filter((c) => SHOP_CATEGORY_BY_ID[c] || SERVICE_TYPE_BY_ID[c]);
  const idNumber = str(f, "idNumber", 20);
  const kraPin = str(f, "kraPin", 20).toUpperCase();
  if (storeName.length < 3) back(J, "error", "Give your store a name (at least 3 letters).");
  if (!phone) back(J, "error", "Enter a valid Safaricom number for orders and payouts.");
  if (!categories.length) back(J, "error", "Pick at least one thing you sell or offer.");
  if (!/^\d{6,10}$/.test(idNumber)) back(J, "error", "Enter your National ID number (digits only).");
  if (!/^[AP]\d{9}[A-Z]$/.test(kraPin)) back(J, "error", "Enter a valid KRA PIN, e.g. A012345678Z.");
  if (str(f, "agree") !== "on") back(J, "error", "Please accept the seller terms.");

  let slug = slugify(storeName);
  const taken = await db.select({ id: s.vendors.id, userId: s.vendors.userId }).from(s.vendors).where(eq(s.vendors.slug, slug));
  if (taken.some((t) => t.userId !== me.id)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const values = {
    storeName,
    slug,
    tagline: str(f, "tagline", 120),
    description: str(f, "description", 1500),
    location: str(f, "location", 60),
    categories,
    phone,
    payoutMethod: "mpesa",
    payoutAccount: normalizePhone(str(f, "payoutAccount")) || phone,
    kyc: { idNumber, kraPin, businessReg: str(f, "businessReg", 40) || undefined },
    logo: str(f, "logo", 500) || null,
    sellerType,
    hub: str(f, "hub", 30) || null,
    status: "pending" as const,
    note: null,
  };
  if (existing) await db.update(s.vendors).set(values).where(eq(s.vendors.id, existing.id));
  else await db.insert(s.vendors).values({ id: newId("v_"), userId: me.id, ...values });
  await notifyAdmins("application", `New seller application: ${storeName}`, "/admin/approvals?tab=sellers");
  revalidatePath("/", "layout");
  back(J, "ok", "Application sent. Our team checks your details within 2 working days. Your Seller centre appears in the sidebar once you're approved.");
}

export async function updateStore(f: FormData) {
  const { v } = await vendorOrFail();
  const db = await getDb();
  const phone = normalizePhone(str(f, "phone")) || v.phone;
  await db
    .update(s.vendors)
    .set({
      tagline: str(f, "tagline", 120),
      description: str(f, "description", 1500),
      location: str(f, "location", 60),
      logo: str(f, "logo", 500).split("\n")[0] || null,
      banner: str(f, "banner", 500).split("\n")[0] || null,
      phone,
      payoutAccount: normalizePhone(str(f, "payoutAccount")) || phone,
      categories: f.getAll("categories").map(String).filter((c) => SHOP_CATEGORY_BY_ID[c] || SERVICE_TYPE_BY_ID[c]),
      hub: str(f, "hub", 30) || v.hub,
    })
    .where(eq(s.vendors.id, v.id));
  revalidatePath("/", "layout");
  back("/vendor/store", "ok", "Store details saved.");
}

export async function saveProduct(f: FormData) {
  const { v } = await vendorOrFail();
  const db = await getDb();
  const settings = await getSettings();
  const id = str(f, "id");
  const title = str(f, "title", 100);
  const kind = str(f, "kind") === "service" ? "service" : "product";
  const price = int(f, kind === "service" ? "servicePrice" : "price");
  const category = kind === "service" ? str(f, "serviceType") : str(f, "category");
  const images = str(f, "images", 5000).split("\n").filter(Boolean).slice(0, 8);
  const ret = `/vendor/products?edit=${id || "new"}`;
  if (title.length < 3) back(ret, "error", "Give the product a name.");
  if (price < 50) back(ret, "error", "Set a price of at least KES 50.");
  if (kind === "product" ? !SHOP_CATEGORY_BY_ID[category] : !SERVICE_TYPE_BY_ID[category]) back(ret, "error", "Choose a category.");
  if (!images.length) back(ret, "error", "Add at least one photo.");
  const compareAt = int(f, "compareAt") || null;
  const values = {
    title,
    kind,
    serviceType: kind === "service" ? category : null,
    hub: kind === "service" ? str(f, "hub", 30) || v.hub : null,
    unit: kind === "service" && SERVICE_UNITS[str(f, "unit")] ? str(f, "unit") : "item",
    fulfilledBy: kind === "product" && str(f, "fulfilledBy") === "tembea" ? "tembea" : "seller",
    languages: str(f, "languages", 200)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8),
    capacity: kind === "service" ? int(f, "capacity") || null : null,
    description: str(f, "description", 4000),
    category,
    price,
    compareAt: compareAt && compareAt > price ? compareAt : null,
    stock: kind === "service" ? 999 : Math.min(9999, int(f, "stock")),
    images,
    tags: str(f, "tags", 200)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8),
    madeIn: str(f, kind === "service" ? "serviceMadeIn" : "madeIn", 60),
    // Every new or edited listing goes back to review when approval is on; drafts stay drafts.
    status: (str(f, "draft") === "1" ? "draft" : settings.productApproval ? "pending" : "active") as "draft" | "pending" | "active",
    rejectReason: null,
    updatedAt: new Date(),
  };
  if (id) {
    const row = (await db.select().from(s.products).where(and(eq(s.products.id, id), eq(s.products.vendorId, v.id))))[0];
    if (!row) back("/vendor/products", "error", "Product not found.");
    // Stock or price-only edits on a live product don't need a new review.
    const onlyStock = row!.status === "active" && row!.title === title && row!.description === values.description && row!.images.join() === images.join();
    await db.update(s.products).set({ ...values, status: onlyStock && values.status !== "draft" ? "active" : values.status }).where(eq(s.products.id, id));
  } else {
    await db.insert(s.products).values({ id: newId("p_"), vendorId: v.id, ...values });
  }
  revalidatePath("/", "layout");
  back("/vendor/products", "ok", values.status === "pending" ? "Saved. It goes live once our team approves it (usually the same day)." : values.status === "draft" ? "Saved as a draft." : "Saved and live.");
}

export async function setProductVisibility(f: FormData) {
  const { v } = await vendorOrFail();
  const db = await getDb();
  const id = str(f, "id");
  const to = str(f, "to");
  const row = (await db.select().from(s.products).where(and(eq(s.products.id, id), eq(s.products.vendorId, v.id))))[0];
  if (!row) back("/vendor/products", "error", "Product not found.");
  if (to === "hidden" && row!.status === "active") await db.update(s.products).set({ status: "hidden" }).where(eq(s.products.id, id));
  if (to === "show" && row!.status === "hidden") await db.update(s.products).set({ status: "active" }).where(eq(s.products.id, id));
  if (to === "delete") {
    const sold = await db.select({ id: s.orderItems.id }).from(s.orderItems).where(eq(s.orderItems.productId, id)).limit(1);
    if (sold.length) await db.update(s.products).set({ status: "hidden", stock: 0 }).where(eq(s.products.id, id));
    else await db.delete(s.products).where(eq(s.products.id, id));
  }
  revalidatePath("/", "layout");
  back("/vendor/products", "ok", to === "delete" ? "Product removed." : "Updated.");
}

/**
 * Sellers move their own items along.
 *  - products: packed → handed to courier (with courier name and tracking) — delivery is confirmed by the buyer or an admin
 *  - services: confirm the booking (or decline it) → mark done — the buyer confirms and the money is released
 */
export async function setItemFulfilment(f: FormData) {
  const { v } = await vendorOrFail();
  const db = await getDb();
  const ids = f.getAll("id").map(String);
  const to = str(f, "to");
  const note = str(f, "note", 200);
  if (!["processing", "shipped", "cancelled"].includes(to) || !ids.length) back("/vendor/orders", "error", "Nothing to update.");
  const rows = await db
    .select({ i: s.orderItems, o: s.orders })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(inArray(s.orderItems.id, ids), eq(s.orderItems.vendorId, v.id)));
  const touched = new Set<string>();
  for (const { i, o } of rows) {
    if (["pending_payment", "cancelled", "refunded"].includes(o.status) || ["delivered", "cancelled"].includes(i.fulfilment)) continue;
    if (to === "cancelled" && i.kind !== "service") continue;
    await db
      .update(s.orderItems)
      .set({ fulfilment: to as "processing" | "shipped" | "cancelled", trackingNote: note || i.trackingNote, updatedAt: new Date() })
      .where(eq(s.orderItems.id, i.id));
    touched.add(o.id);
    const svc = i.kind === "service";
    const msg = svc
      ? to === "processing"
        ? `${v.storeName.replace(" (demo)", "")} confirmed your booking for ${i.bookingDate}`
        : to === "cancelled"
          ? `${v.storeName.replace(" (demo)", "")} can't make ${i.bookingDate} — Tembea will refund you`
          : `${i.title} is marked done — please confirm`
      : to === "processing"
        ? `${i.title} has been packed`
        : `${i.title} is on the way${note ? ` (${note})` : ""}`;
    await notify(o.userId, "order", msg, `/orders/${o.id}`);
    if (!svc) await track(o.id, to === "processing" ? "packed" : "shipped", to === "processing" ? `Packed by ${v.storeName.replace(" (demo)", "")}` : "Handed to the courier", note, v.location);
    else await track(o.id, to, to === "processing" ? "Booking confirmed" : to === "cancelled" ? "Booking declined — refund due" : "Service done", note);
  }
  for (const id of touched) await syncOrderStatus(id);
  revalidatePath("/vendor", "layout");
  back("/vendor/orders", "ok", "Updated. The buyer has been notified.");
}

export async function requestPayout(f: FormData) {
  const { me, v } = await vendorOrFail();
  if (v.status !== "verified") back("/vendor/earnings", "error", "Payouts open once your store is verified.");
  const db = await getDb();
  const settings = await getSettings();
  const bal = await vendorBalance(v.id, me.id);
  const amount = int(f, "amount") || bal.available;
  if (amount < settings.minPayoutKes) back("/vendor/earnings", "error", `The minimum payout is KES ${settings.minPayoutKes.toLocaleString()}.`);
  if (amount > bal.available) back("/vendor/earnings", "error", "That's more than your available balance.");
  await db.insert(s.payouts).values({ id: newId("po_"), userId: me.id, payeeType: "vendor", amount, method: v.payoutMethod, destination: v.payoutAccount || v.phone });
  revalidatePath("/vendor", "layout");
  back("/vendor/earnings", "ok", "Payout requested. You'll receive it on M-Pesa once approved.");
}
