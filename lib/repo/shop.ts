import { and, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "../db";

export type StoreCard = {
  id: string;
  slug: string;
  storeName: string;
  tagline: string;
  logo: string | null;
  banner: string | null;
  location: string;
  categories: string[];
  sellerType: string;
  hub: string | null;
  rating: number;
  ratingCount: number;
  products: number;
  cover: string | null;
  demo: boolean;
};

export type ProductCard = {
  id: string;
  kind: "product" | "service";
  title: string;
  price: number;
  compareAt: number | null;
  image: string | null;
  images: string[];
  category: string;
  serviceType: string | null;
  hub: string | null;
  unit: string;
  stock: number;
  madeIn: string;
  express: boolean;
  rating: number;
  ratingCount: number;
  sold: number;
  featured: boolean;
  createdAt: number;
  vendorId: string;
  storeName: string;
  storeSlug: string;
  storeLogo: string | null;
  demo: boolean;
};

/** Verified stores with at least one live listing. */
export async function listStores(opts: { sellerType?: "maker" | "pro" } = {}): Promise<StoreCard[]> {
  const db = await getDb();
  const where: SQL[] = [eq(s.vendors.status, "verified")];
  if (opts.sellerType === "maker") where.push(ne(s.vendors.sellerType, "pro"));
  if (opts.sellerType === "pro") where.push(ne(s.vendors.sellerType, "maker"));
  const rows = await db
    .select({
      v: s.vendors,
      products: sql<number>`(select count(*)::int from ${s.products} p where p.vendor_id = ${s.vendors.id} and p.status = 'active')`,
      cover: sql<string | null>`(select p.images[1] from ${s.products} p where p.vendor_id = ${s.vendors.id} and p.status = 'active' order by p.sales_count desc limit 1)`,
    })
    .from(s.vendors)
    .where(and(...where))
    .orderBy(desc(s.vendors.featured), desc(s.vendors.ratingAvg));
  return rows
    .filter((r) => r.products > 0)
    .map(({ v, products, cover }) => ({ id: v.id, slug: v.slug, storeName: v.storeName, tagline: v.tagline, logo: v.logo, banner: v.banner, location: v.location, categories: v.categories, sellerType: v.sellerType, hub: v.hub, rating: v.ratingAvg, ratingCount: v.ratingCount, products, cover, demo: v.note === "demo" }));
}

function toCard(p: typeof s.products.$inferSelect, v: { storeName: string; slug: string; logo: string | null; note: string | null }): ProductCard {
  return {
    id: p.id,
    kind: p.kind === "service" ? "service" : "product",
    title: p.title,
    price: p.price,
    compareAt: p.compareAt,
    image: p.images[0] ?? null,
    images: p.images.slice(0, 4),
    category: p.category,
    serviceType: p.serviceType,
    hub: p.hub,
    unit: p.unit,
    stock: p.stock,
    madeIn: p.madeIn,
    express: p.fulfilledBy === "tembea",
    rating: p.ratingAvg,
    ratingCount: p.ratingCount,
    sold: p.salesCount,
    featured: p.featured,
    createdAt: p.createdAt.getTime(),
    vendorId: p.vendorId,
    storeName: v.storeName,
    storeSlug: v.slug,
    storeLogo: v.logo,
    demo: v.note === "demo",
  };
}

/** Live listings (products and services) from verified sellers. */
export async function listProducts(opts: { kind?: "product" | "service"; category?: string; hub?: string; q?: string; vendorId?: string; ids?: string[]; limit?: number } = {}): Promise<ProductCard[]> {
  const db = await getDb();
  const where: SQL[] = [eq(s.products.status, "active"), eq(s.vendors.status, "verified")];
  if (opts.kind) where.push(eq(s.products.kind, opts.kind));
  if (opts.category) where.push(or(eq(s.products.category, opts.category), eq(s.products.serviceType, opts.category))!);
  if (opts.hub) where.push(eq(s.products.hub, opts.hub));
  if (opts.vendorId) where.push(eq(s.products.vendorId, opts.vendorId));
  if (opts.ids?.length) where.push(inArray(s.products.id, opts.ids));
  if (opts.q) where.push(or(ilike(s.products.title, `%${opts.q}%`), ilike(s.products.description, `%${opts.q}%`), ilike(s.vendors.storeName, `%${opts.q}%`))!);
  const rows = await db
    .select({ p: s.products, storeName: s.vendors.storeName, slug: s.vendors.slug, logo: s.vendors.logo, note: s.vendors.note })
    .from(s.products)
    .innerJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
    .where(and(...where))
    .orderBy(desc(s.products.featured), desc(s.products.salesCount), desc(s.products.createdAt))
    .limit(opts.limit ?? 300);
  return rows.map(({ p, ...v }) => toCard(p, v));
}

export async function getStore(slug: string) {
  const db = await getDb();
  const v = (await db.select().from(s.vendors).where(and(eq(s.vendors.slug, slug), eq(s.vendors.status, "verified"))))[0];
  if (!v) return null;
  const [products, reviews, owner] = await Promise.all([
    listProducts({ vendorId: v.id }),
    db
      .select({ r: s.productReviews, name: s.users.name, image: s.users.image, product: s.products.title })
      .from(s.productReviews)
      .leftJoin(s.users, eq(s.users.id, s.productReviews.userId))
      .leftJoin(s.products, eq(s.products.id, s.productReviews.productId))
      .where(and(eq(s.productReviews.vendorId, v.id), eq(s.productReviews.status, "visible")))
      .orderBy(desc(s.productReviews.createdAt))
      .limit(12),
    db.select({ handle: s.users.handle }).from(s.users).where(eq(s.users.id, v.userId)),
  ]);
  const score = await sellerScore(v.id);
  return { vendor: v, products, reviews, score, ownerHandle: owner[0]?.handle ?? null };
}

export async function getProduct(id: string) {
  const db = await getDb();
  const row = (
    await db
      .select({ p: s.products, v: s.vendors })
      .from(s.products)
      .innerJoin(s.vendors, eq(s.vendors.id, s.products.vendorId))
      .where(and(eq(s.products.id, id), eq(s.products.status, "active"), eq(s.vendors.status, "verified")))
  )[0];
  if (!row) return null;
  const [more, similar, reviews, posts] = await Promise.all([
    listProducts({ vendorId: row.v.id, limit: 9 }),
    listProducts({ category: row.p.kind === "service" ? row.p.serviceType ?? row.p.category : row.p.category, limit: 9 }),
    db
      .select({ r: s.productReviews, name: s.users.name, image: s.users.image })
      .from(s.productReviews)
      .leftJoin(s.users, eq(s.users.id, s.productReviews.userId))
      .where(and(eq(s.productReviews.productId, id), eq(s.productReviews.status, "visible")))
      .orderBy(desc(s.productReviews.createdAt))
      .limit(20),
    db
      .select({ id: s.posts.id, media: s.posts.media, text: s.posts.text })
      .from(s.posts)
      .where(and(eq(s.posts.productId, id), eq(s.posts.status, "visible")))
      .orderBy(desc(s.posts.createdAt))
      .limit(8),
  ]);
  db.update(s.products).set({ viewCount: sql`${s.products.viewCount} + 1` }).where(eq(s.products.id, id)).catch(() => {});
  return {
    product: row.p,
    vendor: row.v,
    score: await sellerScore(row.v.id),
    more: more.filter((x) => x.id !== id).slice(0, 8),
    similar: similar.filter((x) => x.id !== id && x.vendorId !== row.v.id).slice(0, 8),
    reviews: reviews.map(({ r, name, image }) => ({ id: r.id, rating: r.rating, text: r.text, images: r.images, name: name || "Buyer", image, createdAt: r.createdAt.getTime() })),
    posts,
  };
}

/**
 * Jumia-style seller score (0–5): customer rating, fulfilment rate, on-time shipping, strikes.
 * Shown to buyers on the store and to sellers in their dashboard.
 */
export async function sellerScore(vendorId: string) {
  const db = await getDb();
  const live = sql`${s.orders.status} not in ('pending_payment')`;
  const [agg, v] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        cancelled: sql<number>`count(*) filter (where ${s.orderItems.fulfilment} = 'cancelled')::int`,
        delivered: sql<number>`count(*) filter (where ${s.orderItems.fulfilment} = 'delivered')::int`,
        returned: sql<number>`count(*) filter (where ${s.orderItems.returnStatus} in ('approved','refunded'))::int`,
        late: sql<number>`count(*) filter (where ${s.orderItems.kind} = 'product' and ${s.orderItems.fulfilment} in ('shipped','delivered') and ${s.orderItems.updatedAt} > ${s.orders.paidAt} + interval '3 days')::int`,
      })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orderItems.vendorId, vendorId), live)),
    db.select({ rating: s.vendors.ratingAvg, count: s.vendors.ratingCount, strikes: s.vendors.strikes }).from(s.vendors).where(eq(s.vendors.id, vendorId)),
  ]);
  const a = agg[0];
  const vv = v[0] ?? { rating: 0, count: 0, strikes: 0 };
  const cancelRate = a.total ? a.cancelled / a.total : 0;
  const lateRate = a.delivered ? a.late / Math.max(1, a.delivered) : 0;
  const returnRate = a.delivered ? a.returned / a.delivered : 0;
  const rating = vv.count ? vv.rating : 4.5;
  const score = Math.max(0, Math.min(5, rating - cancelRate * 5 - lateRate * 2 - returnRate * 3 - vv.strikes * 0.5));
  return { score: Math.round(score * 10) / 10, rating: vv.rating, ratingCount: vv.count, orders: a.total, delivered: a.delivered, cancelRate, lateRate, returnRate, strikes: vv.strikes };
}

/** Vendor money: what's been earned, what's waiting on delivery, and what's already been paid out. */
export async function vendorBalance(vendorId: string, userId: string) {
  const db = await getDb();
  const live = sql`${s.orders.status} not in ('pending_payment','cancelled','refunded')`;
  const notReturned = or(isNull(s.orderItems.returnStatus), eq(s.orderItems.returnStatus, "rejected"))!;
  const [earned, pending, gross, paidOut] = await Promise.all([
    db.select({ n: sql<number>`coalesce(sum(${s.orderItems.vendorAmount}),0)::int` }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(and(eq(s.orderItems.vendorId, vendorId), eq(s.orderItems.fulfilment, "delivered"), notReturned, live)),
    db.select({ n: sql<number>`coalesce(sum(${s.orderItems.vendorAmount}),0)::int` }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(and(eq(s.orderItems.vendorId, vendorId), inArray(s.orderItems.fulfilment, ["pending", "processing", "shipped"]), live)),
    db.select({ sales: sql<number>`coalesce(sum(${s.orderItems.lineTotal}),0)::int`, commission: sql<number>`coalesce(sum(${s.orderItems.commission}),0)::int`, units: sql<number>`coalesce(sum(${s.orderItems.qty}),0)::int` }).from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId)).where(and(eq(s.orderItems.vendorId, vendorId), live, sql`${s.orderItems.fulfilment} <> 'cancelled'`)),
    db.select({ n: sql<number>`coalesce(sum(${s.payouts.amount}),0)::int` }).from(s.payouts).where(and(eq(s.payouts.userId, userId), eq(s.payouts.payeeType, "vendor"), inArray(s.payouts.status, ["requested", "approved", "paid"]))),
  ]);
  return { earned: earned[0].n, pending: pending[0].n, available: Math.max(0, earned[0].n - paidOut[0].n), paidOut: paidOut[0].n, sales: gross[0].sales, commission: gross[0].commission, units: gross[0].units };
}

export async function myVendor(userId: string) {
  const db = await getDb();
  return (await db.select().from(s.vendors).where(eq(s.vendors.userId, userId)))[0] ?? null;
}

/** Recompute a listing's and its seller's average rating after a review. */
export async function refreshRatings(productId: string, vendorId: string) {
  const db = await getDb();
  const [p] = await db.select({ avg: sql<number>`coalesce(avg(${s.productReviews.rating}),0)::float`, n: sql<number>`count(*)::int` }).from(s.productReviews).where(and(eq(s.productReviews.productId, productId), eq(s.productReviews.status, "visible")));
  const [v] = await db.select({ avg: sql<number>`coalesce(avg(${s.productReviews.rating}),0)::float`, n: sql<number>`count(*)::int` }).from(s.productReviews).where(and(eq(s.productReviews.vendorId, vendorId), eq(s.productReviews.status, "visible")));
  if (p.n) await db.update(s.products).set({ ratingAvg: p.avg, ratingCount: p.n }).where(eq(s.products.id, productId));
  if (v.n) await db.update(s.vendors).set({ ratingAvg: v.avg, ratingCount: v.n }).where(eq(s.vendors.id, vendorId));
}
