import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "../db";

const count = sql<number>`count(*)::int`;

/** Things waiting for an admin, shown as badges in the admin menu. */
export async function adminQueues() {
  const db = await getDb();
  const [vendors, products, subs, live, reviews, reports, payouts, apps, orders, creatorApps] = await Promise.all([
    db.select({ n: count }).from(s.vendors).where(eq(s.vendors.status, "pending")),
    db.select({ n: count }).from(s.products).where(eq(s.products.status, "pending")),
    db.select({ n: count }).from(s.videoSubmissions).where(inArray(s.videoSubmissions.status, ["submitted", "in_review"])),
    db.select({ n: count }).from(s.liveSessions).where(eq(s.liveSessions.status, "proposed")),
    db.select({ n: count }).from(s.reviews).where(eq(s.reviews.status, "pending")),
    db.select({ n: count }).from(s.reports).where(eq(s.reports.status, "open")),
    db.select({ n: count }).from(s.payouts).where(inArray(s.payouts.status, ["requested", "approved"])),
    db.select({ n: count }).from(s.applications).where(and(eq(s.applications.status, "pending"), eq(s.applications.kind, "provider"))),
    db.select({ n: count }).from(s.orders).where(eq(s.orders.status, "paid")),
    db.select({ n: count }).from(s.applications).where(and(eq(s.applications.status, "pending"), eq(s.applications.kind, "creator"))),
  ]);
  return {
    vendors: vendors[0].n,
    products: products[0].n,
    submissions: subs[0].n,
    live: live[0].n,
    reviews: reviews[0].n,
    reports: reports[0].n,
    payouts: payouts[0].n,
    providerApps: apps[0].n,
    ordersToShip: orders[0].n,
    creatorApps: creatorApps[0].n,
  };
}
