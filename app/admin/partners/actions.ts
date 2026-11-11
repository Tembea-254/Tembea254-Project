"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import type { PartnerKind } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Math.max(0, Number(str(f, k).replace(/[^\d.]/g, "")) || 0);
const lines = (f: FormData, k: string) =>
  str(f, k)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 15);
const back = (tab: string, kind: "ok" | "error", msg: string): never => redirect(`/admin/partners?tab=${tab}&${kind}=${encodeURIComponent(msg)}`);
const KINDS: PartnerKind[] = ["operator", "stay", "transport"];
const kindOf = (v: string) => (KINDS.includes(v as PartnerKind) ? (v as PartnerKind) : "operator");
const link = (v: string) => (/^https?:\/\//.test(v) || (v.startsWith("/") && !v.startsWith("//")) ? v : v ? `https://${v}` : "");

export async function savePartner(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("pt_");
  const name = str(f, "name", 80);
  if (name.length < 2) back("partners", "error", "Partner name is required.");
  const values = {
    name,
    kind: kindOf(str(f, "kind")),
    website: link(str(f, "website", 300)),
    logo: str(f, "logo", 600).split("\n")[0] || null,
    blurb: str(f, "blurb", 300),
    phone: str(f, "phone", 30),
    sponsored: str(f, "sponsored") === "on",
    demo: str(f, "demo") === "on",
    commission: Math.min(0.5, num(f, "commission") / 100),
  };
  const db = await getDb();
  await db.insert(s.partners).values({ id, ...values }).onConflictDoUpdate({ target: s.partners.id, set: values });
  await audit(me, "partner.save", id, { name });
  back("partners", "ok", `${name} saved.`);
}

export async function togglePartner(f: FormData) {
  const me = await requireAdmin();
  const field = str(f, "field");
  if (!["active", "sponsored"].includes(field)) return;
  const db = await getDb();
  await db.update(s.partners).set({ [field]: str(f, "value") === "1" }).where(eq(s.partners.id, str(f, "id")));
  await audit(me, `partner.${field}`, str(f, "id"), { value: str(f, "value") });
  revalidatePath("/admin/partners");
}

export async function saveOffer(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("of_");
  const title = str(f, "title", 120);
  const partnerId = str(f, "partnerId");
  const price = Math.round(num(f, "pricePerPerson"));
  if (title.length < 4 || !partnerId || !price) back("packages", "error", "Title, partner and price are required.");
  const places = f.getAll("places").map(String).slice(0, 12);
  if (!places.length) back("packages", "error", "Pick at least one place the package covers.");
  const values = {
    partnerId,
    title,
    kind: kindOf(str(f, "kind")),
    places,
    days: Math.max(1, Math.round(num(f, "days"))),
    tier: ["budget", "mid", "luxury"].includes(str(f, "tier")) ? str(f, "tier") : "mid",
    pricePerPerson: price,
    includes: lines(f, "includes"),
    excludes: lines(f, "excludes"),
    url: link(str(f, "url", 600)),
    rating: num(f, "rating") ? Math.min(5, num(f, "rating")) : null,
    reviews: Math.round(num(f, "reviews")),
  };
  const db = await getDb();
  await db.insert(s.partnerOffers).values({ id, ...values }).onConflictDoUpdate({ target: s.partnerOffers.id, set: values });
  await audit(me, "offer.save", id, { title, price });
  back("packages", "ok", `"${title}" saved. It shows in the planner for trips that visit those places.`);
}

export async function toggleOffer(f: FormData) {
  const me = await requireAdmin();
  const db = await getDb();
  await db.update(s.partnerOffers).set({ active: str(f, "value") === "1" }).where(eq(s.partnerOffers.id, str(f, "id")));
  await audit(me, "offer.active", str(f, "id"), { value: str(f, "value") });
  revalidatePath("/admin/partners");
}

export async function saveAd(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id") || newId("ad_");
  const headline = str(f, "headline", 90);
  const url = link(str(f, "url", 600));
  if (headline.length < 4 || !url) back("ads", "error", "A headline and a link are required.");
  const date = (k: string) => (str(f, k) ? new Date(str(f, k)) : null);
  const values = {
    partnerId: str(f, "partnerId") || null,
    headline,
    body: str(f, "body", 160),
    image: str(f, "image", 600).split("\n")[0] || null,
    cta: str(f, "cta", 24) || "Learn more",
    url,
    placement: str(f, "placement", 20) || "all",
    startsAt: date("startsAt"),
    endsAt: date("endsAt"),
  };
  const db = await getDb();
  await db.insert(s.ads).values({ id, ...values }).onConflictDoUpdate({ target: s.ads.id, set: values });
  await audit(me, "ad.save", id, { headline });
  back("ads", "ok", "Ad saved.");
}

export async function toggleAd(f: FormData) {
  const me = await requireAdmin();
  const db = await getDb();
  await db.update(s.ads).set({ active: str(f, "value") === "1" }).where(eq(s.ads.id, str(f, "id")));
  await audit(me, "ad.active", str(f, "id"), { value: str(f, "value") });
  revalidatePath("/admin/partners");
}

/** A business that asked to advertise: approving creates the partner, ready for packages and ads. */
export async function decideLead(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const approve = str(f, "decision") === "approve";
  const db = await getDb();
  const lead = (await db.select().from(s.applications).where(eq(s.applications.id, id)))[0];
  if (!lead) back("leads", "error", "Lead not found.");
  const d = lead!.data as Record<string, string>;
  await db.update(s.applications).set({ status: approve ? "approved" : "rejected", reviewedBy: me.id, note: str(f, "note", 300) || null }).where(eq(s.applications.id, id));
  if (approve)
    await db
      .insert(s.partners)
      .values({ id: newId("pt_"), name: d.company || "New partner", kind: kindOf(d.kind), website: link(d.website || ""), phone: d.phone || "", blurb: d.message?.slice(0, 300) || "", active: true })
      .onConflictDoNothing();
  await audit(me, `partner.lead.${approve ? "approve" : "reject"}`, id);
  back(approve ? "partners" : "leads", "ok", approve ? `${d.company} added as a partner. Add their packages next.` : "Lead closed.");
}
