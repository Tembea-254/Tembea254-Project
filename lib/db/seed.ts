import { eq } from "drizzle-orm";
import { POSTS } from "../data/blog";
import { IMG } from "../data/images";
import { SEED_POSTS } from "../data/community";
import { PHRASES } from "../data/languages";
import { PROVIDERS } from "../data/market";
import { VR_DESTINATIONS } from "../data/vr";
import type { DB } from "./index";
import * as s from "./schema";
import { seedMarket } from "./seed-market";
import { seedSocial } from "./seed-social";
import { DEFAULT_SETTINGS } from "./settings-defaults";

/** Bump when the seed data changes; the seed runs once per version. */
const SEED_VERSION = 3;

/**
 * Fills a new database with Tembea's built-in content (VR destinations, blog, phrasebook,
 * demo providers and a demo shop) so the site and the admin dashboard work from day one.
 * Safe to run many times: it only inserts what's missing.
 */
export async function seed(db: DB) {
  const done = await db.select().from(s.settings).where(eq(s.settings.key, "seed_version"));
  if (done[0] && Number(done[0].value) >= SEED_VERSION) return;

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.settings).values({ key, value }).onConflictDoNothing();
  }

  // Virtual pre-visits
  for (const [i, d] of VR_DESTINATIONS.entries()) {
    const { slug, name, region, type, scenes, ...rest } = d;
    await db.insert(s.vrDestinations).values({ slug, name, region, type, sort: i, data: rest }).onConflictDoNothing();
    for (const [j, sc] of scenes.entries()) {
      await db
        .insert(s.vrScenes)
        .values({
          id: sc.id,
          destinationSlug: slug,
          mode: sc.mode,
          title: sc.title,
          spot: sc.spot,
          time: sc.time,
          source: sc.source,
          minutes: sc.minutes,
          yaw: sc.yaw ?? null,
          premium: !!sc.premium,
          credit: sc.credit,
          sort: j,
        })
        .onConflictDoNothing();
    }
  }

  // Blog
  for (const p of POSTS) {
    await db
      .insert(s.blogPosts)
      .values({ slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, cover: p.cover, author: p.author, readMins: p.readMins, sections: p.sections, related: p.related ?? null, status: "published", publishedAt: p.date })
      .onConflictDoNothing();
  }

  // Phrasebook
  for (const ph of PHRASES) {
    const { id, en, category, ...tr } = ph;
    await db.insert(s.phrases).values({ id, english: en, category, translations: tr as Record<string, string> }).onConflictDoNothing();
  }

  // Hire marketplace (demo providers)
  for (const p of PROVIDERS) {
    await db
      .insert(s.providers)
      .values({
        id: p.id,
        hub: p.hub,
        category: p.category,
        name: p.name,
        base: p.base,
        headline: p.headline,
        about: p.about,
        offer: p.offer,
        rate: p.rate,
        unit: p.unit,
        terms: p.terms,
        languages: p.languages,
        years: p.years,
        specialties: p.specialties,
        checks: p.checks,
        image: p.image,
        demo: p.demo,
        status: "active",
      })
      .onConflictDoNothing();
  }

  // Tembea team user for official posts, and the starter community posts
  await db.insert(s.users).values({ id: "tembea-team", email: "team@tembea254.com", name: "Tembea team", provider: "system", role: "admin" }).onConflictDoNothing();
  for (const p of SEED_POSTS) {
    await db
      .insert(s.posts)
      .values({ id: p.id, userId: "tembea-team", kind: p.kind, text: p.text, placeId: p.placeId ?? null, media: p.image ? [{ type: "image", url: p.image }] : [], team: true, createdAt: new Date(p.createdAt) })
      .onConflictDoNothing();
  }

  // Demo shop so the catalogue isn't empty (clearly marked as demo in the UI)
  await db.insert(s.users).values({ id: "demo-vendor", email: "demo-vendor@tembea254.com", name: "Demo vendor", provider: "system" }).onConflictDoNothing();
  await db
    .insert(s.vendors)
    .values({
      id: "v_demo",
      userId: "demo-vendor",
      storeName: "Enkiteng Crafts (demo)",
      slug: "enkiteng-crafts",
      tagline: "Maasai beadwork and shúkà from Narok",
      description: "A demo store showing how vendor catalogues look. Real Kenyan makers will appear here once they're verified.",
      location: "Narok",
      categories: ["beadwork", "garments"],
      phone: "0700000000",
      payoutAccount: "0700000000",
      status: "verified",
      note: "demo",
      verifiedAt: new Date(),
    })
    .onConflictDoNothing();
  const demoProducts: (typeof s.products.$inferInsert)[] = [
    { id: "p_demo1", vendorId: "v_demo", title: "Beaded Maasai collar", description: "Hand-beaded collar in traditional colours. Each colour carries a meaning — red for bravery, blue for the sky, green for the land.", category: "beadwork", price: 3500, stock: 12, images: [IMG.maasaiWomen], madeIn: "Narok", status: "active", tags: ["handmade", "women-led"] },
    { id: "p_demo2", vendorId: "v_demo", title: "Red shúkà blanket", description: "The classic checked Maasai cloth — warm for dawn game drives, beautiful as a throw at home.", category: "garments", price: 2200, compareAt: 2600, stock: 30, images: [IMG.maasaiShuka], madeIn: "Narok", status: "active", tags: ["textile"] },
    { id: "p_demo3", vendorId: "v_demo", title: "Beaded bracelet set (3)", description: "Three stackable bracelets in Kenyan flag colours.", category: "beadwork", price: 900, stock: 50, images: [IMG.maasaiShuka], madeIn: "Narok", status: "active", tags: ["gift"] },
  ];
  for (const p of demoProducts) await db.insert(s.products).values(p).onConflictDoNothing();

  await db.insert(s.safetyAlerts).values({ id: "alert_welcome", title: "Emergency numbers", body: "Dial 999 or 112 from any phone for police, fire or ambulance. Save your lodge's number before heading out on game drives.", level: "info" }).onConflictDoNothing();

  await seedMarket(db);
  await seedSocial(db);
  await importLegacyUsers(db);

  await db
    .insert(s.settings)
    .values({ key: "seed_version", value: SEED_VERSION })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: SEED_VERSION } });
}

/** Brings over accounts created before the database existed (.data/users.json locally, Redis on Vercel). */
async function importLegacyUsers(db: DB) {
  type Legacy = { id: string; name: string; email: string; passwordHash: string; createdAt: number };
  const legacy: Legacy[] = [];
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    legacy.push(...(JSON.parse(await fs.readFile(path.join(process.cwd(), ".data", "users.json"), "utf8")) as Legacy[]));
  } catch {
    /* no local file */
  }
  try {
    const { kv, kvEnabled } = await import("../kv");
    if (kvEnabled) for (const k of await kv.keys("user:*")) {
      const u = await kv.get<Legacy>(k);
      if (u) legacy.push(u);
    }
  } catch (e) {
    console.error("[seed] could not read Redis users", e);
  }
  const admins = (process.env.ADMIN_EMAILS || "piusdenistech@gmail.com").split(",").map((e) => e.trim().toLowerCase());
  for (const u of legacy) {
    if (!u?.email) continue;
    await db
      .insert(s.users)
      .values({ id: u.id, email: u.email.toLowerCase(), name: u.name, passwordHash: u.passwordHash, provider: "email", role: admins.includes(u.email.toLowerCase()) ? "admin" : "user", createdAt: new Date(u.createdAt || Date.now()) })
      .onConflictDoNothing();
  }
}
