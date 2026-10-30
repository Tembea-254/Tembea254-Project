import { eq } from "drizzle-orm";
import { IMG } from "../data/images";
import { PROVIDERS, type Provider } from "../data/market";
import type { DB } from "./index";
import * as s from "./schema";

/**
 * Demo sellers for the open marketplace (v2): every demo hire provider becomes a "pro" seller
 * with a bookable service listing, plus a handful of demo maker stores so the shop looks alive.
 * Everything is labelled Demo in the UI and can be hidden from the admin.
 */
const SERVICE_TYPE: Record<Provider["category"], string> = {
  "Drivers & vehicles": "drivers",
  "Tour & local guides": "guides",
  Photographers: "photographers",
  "Local artists": "artists",
};
const UNIT: Record<string, string> = { "per day": "day", "per half day": "half-day", "per session": "session", "per event": "event", "per transfer": "trip" };
const slugify = (t: string) =>
  t
    .replace(/\(demo\)/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
// deterministic pseudo-rating so demo cards look real but stable
const score = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { avg: 4.4 + (h % 6) / 10, count: 8 + (h % 60) };
};

const MAKERS: { id: string; name: string; slug: string; tagline: string; location: string; categories: string[]; logo?: string; banner: string; express?: boolean; products: { id: string; title: string; description: string; category: string; price: number; compareAt?: number; stock: number; images: string[]; madeIn: string; tags: string[]; featured?: boolean }[] }[] = [
  {
    id: "v_demo_kiondo",
    name: "Kiondo Weavers of Machakos (demo)",
    slug: "kiondo-weavers",
    tagline: "Sisal kiondo baskets woven by a women's group",
    location: "Machakos",
    categories: ["baskets", "home"],
    banner: "photo-1768902406144-a348c559c73c",
    express: true,
    products: [
      { id: "p_dk1", title: "Sisal kiondo basket with leather straps", description: "Hand-woven from natural sisal and dyed with plant colours. Leather straps and trim. About 35 cm wide — big enough for the market or the beach.", category: "baskets", price: 2800, compareAt: 3400, stock: 18, images: ["photo-1601330862030-1e08c703ac04", "photo-1455669175216-9017c9b02fc6"], madeIn: "Machakos", tags: ["handmade", "women-led", "best seller"], featured: true },
      { id: "p_dk2", title: "Set of 3 nesting baskets", description: "Three nesting baskets for storage or display. Each one is woven by a different member of the group.", category: "home", price: 4200, stock: 9, images: ["photo-1455669175216-9017c9b02fc6"], madeIn: "Machakos", tags: ["home", "gift"] },
    ],
  },
  {
    id: "v_demo_akamba",
    name: "Akamba Carvers Co-op (demo)",
    slug: "akamba-carvers",
    tagline: "Wood carvings from the Wamunyu carving tradition",
    location: "Wamunyu, Machakos",
    categories: ["carvings", "art"],
    banner: "photo-1760133560453-db72f4074058",
    products: [
      { id: "p_da1", title: "Hand-carved seated elder (mahogany)", description: "Carved from sustainably sourced mahogany and finished with beeswax. About 25 cm tall. Signed by the carver.", category: "carvings", price: 5600, stock: 6, images: ["photo-1696586904897-aa8590c88f92"], madeIn: "Wamunyu", tags: ["one of a kind", "signed"], featured: true },
      { id: "p_da2", title: "Family of figurines", description: "A set of carved figures in jacaranda and ebony tones. Each set is unique.", category: "carvings", price: 3900, compareAt: 4500, stock: 11, images: ["photo-1760133560453-db72f4074058"], madeIn: "Wamunyu", tags: ["gift"] },
    ],
  },
  {
    id: "v_demo_soko",
    name: "Soko Art Studio (demo)",
    slug: "soko-art-studio",
    tagline: "Wildlife paintings by young Nairobi artists",
    location: "Nairobi",
    categories: ["art"],
    banner: "photo-1678380601766-32d249ad08d5",
    express: true,
    products: [
      { id: "p_ds1", title: "Elephant in grey — acrylic on canvas", description: "Original painting, 50 × 70 cm, rolled in a tube for travel. Certificate of authenticity included.", category: "art", price: 14500, stock: 1, images: ["photo-1568198075611-ebec50d3ca1a"], madeIn: "Nairobi", tags: ["original", "wildlife"], featured: true },
      { id: "p_ds2", title: "Zebra study — ink and wash", description: "Black and white study, 30 × 40 cm. Ships flat with a backing board.", category: "art", price: 6800, stock: 3, images: ["photo-1612373931332-9fbb9b2290a1"], madeIn: "Nairobi", tags: ["original"] },
      { id: "p_ds3", title: "Village under the acacia — print", description: "Signed giclée print, A3, on cotton paper.", category: "art", price: 3200, stock: 25, images: ["photo-1678380601766-32d249ad08d5"], madeIn: "Nairobi", tags: ["print", "gift"] },
    ],
  },
  {
    id: "v_demo_lamu",
    name: "Lamu Leather Works (demo)",
    slug: "lamu-leather",
    tagline: "Swahili-style leather sandals made to order",
    location: "Lamu",
    categories: ["leather"],
    banner: "photo-1501851602203-f40cf2f11ba9",
    products: [
      { id: "p_dl1", title: "Swahili leather sandals", description: "Full-grain leather, stitched by hand in Lamu Old Town. Choose your size in the note at checkout.", category: "leather", price: 3500, stock: 20, images: ["photo-1585120824848-8a5cd41493d2", "photo-1501851602203-f40cf2f11ba9"], madeIn: "Lamu", tags: ["handmade", "made to order"], featured: true },
    ],
  },
  {
    id: "v_demo_beads",
    name: "Nasieku Beads (demo)",
    slug: "nasieku-beads",
    tagline: "Beaded jewellery from Kajiado",
    location: "Kajiado",
    categories: ["beadwork"],
    banner: "photo-1606094092594-93c09d76b721",
    express: true,
    products: [
      { id: "p_db1", title: "Layered beaded necklace", description: "Glass beads on wire in red, blue, white and yellow — each colour has a meaning in Maasai tradition.", category: "beadwork", price: 2400, compareAt: 2900, stock: 25, images: ["photo-1606094092594-93c09d76b721"], madeIn: "Kajiado", tags: ["women-led", "best seller"], featured: true },
    ],
  },
];

export async function seedMarket(db: DB) {
  // Pros: drivers, guides, photographers, artists — each one a store with a service listing
  for (const p of PROVIDERS) {
    const uid = `demo-pro-${p.id}`;
    const r = score(p.id);
    await db.insert(s.users).values({ id: uid, email: `${p.id}@demo.tembea254.com`, name: p.name.replace(" (demo)", ""), provider: "system", handle: slugify(p.name).slice(0, 24), bio: p.headline }).onConflictDoNothing();
    await db
      .insert(s.vendors)
      .values({
        id: `v_${p.id}`,
        userId: uid,
        storeName: p.name,
        slug: slugify(p.name),
        tagline: p.headline,
        description: `${p.about}\n\n${p.years} years' experience. Speaks ${p.languages.join(", ")}.`,
        location: p.base,
        categories: [],
        phone: "0700000000",
        payoutAccount: "0700000000",
        status: "verified",
        note: "demo",
        sellerType: "pro",
        hub: p.hub,
        banner: p.image,
        ratingAvg: r.avg,
        ratingCount: r.count,
        verifiedAt: new Date(),
      })
      .onConflictDoNothing();
    await db
      .insert(s.products)
      .values({
        id: `svc_${p.id}`,
        vendorId: `v_${p.id}`,
        kind: "service",
        serviceType: SERVICE_TYPE[p.category],
        hub: p.hub,
        title: p.headline,
        description: `${p.about}\n\nWhat you get: ${p.offer}\n\n${p.terms}\n\nChecked by Tembea: ${p.checks.join(" · ")}`,
        category: SERVICE_TYPE[p.category],
        price: p.rate,
        unit: UNIT[p.unit] ?? "day",
        stock: 999,
        images: [p.image],
        tags: p.specialties,
        languages: p.languages,
        madeIn: p.base,
        status: "active",
        ratingAvg: r.avg,
        ratingCount: r.count,
        salesCount: r.count * 2,
        featured: p.id.endsWith("1"),
      })
      .onConflictDoNothing();
  }

  // More maker stores
  for (const m of MAKERS) {
    const uid = `demo-maker-${m.slug}`;
    const r = score(m.id);
    await db.insert(s.users).values({ id: uid, email: `${m.slug}@demo.tembea254.com`, name: m.name.replace(" (demo)", ""), provider: "system", handle: m.slug.slice(0, 24), bio: m.tagline }).onConflictDoNothing();
    await db
      .insert(s.vendors)
      .values({ id: m.id, userId: uid, storeName: m.name, slug: m.slug, tagline: m.tagline, description: `${m.tagline}. A demo store showing how Kenyan makers sell on Tembea.`, location: m.location, categories: m.categories, phone: "0700000000", payoutAccount: "0700000000", status: "verified", note: "demo", banner: m.banner, ratingAvg: r.avg, ratingCount: r.count, featured: true, verifiedAt: new Date() })
      .onConflictDoNothing();
    for (const p of m.products) {
      const pr = score(p.id);
      await db
        .insert(s.products)
        .values({ ...p, compareAt: p.compareAt ?? null, vendorId: m.id, status: "active", fulfilledBy: m.express ? "tembea" : "seller", ratingAvg: pr.avg, ratingCount: pr.count, salesCount: pr.count * 3, featured: !!p.featured })
        .onConflictDoNothing();
    }
  }
  // the original demo store: give its products ratings and Tembea Express on one item
  await db.update(s.vendors).set({ ratingAvg: 4.8, ratingCount: 41, featured: true, banner: IMG.maasaiShuka }).where(eq(s.vendors.id, "v_demo"));
}
