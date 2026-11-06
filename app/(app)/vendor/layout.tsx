import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { WorkspaceTabs } from "@/components/shell/workspace-tabs";
import { getDb, schema as s } from "@/lib/db";
import { myVendor } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller centre" };

const STATUS: Record<string, { label: string; cls: string; text: string }> = {
  pending: { label: "Under review", cls: "bg-ochre-50 text-ochre-700", text: "" },
  verified: { label: "Verified", cls: "bg-savanna-50 text-savanna-700", text: "" },
  suspended: { label: "Suspended", cls: "bg-maasai-50 text-maasai-700", text: "Your store is paused and hidden from the shop. Contact support@tembea254.app." },
  rejected: { label: "Not approved", cls: "bg-maasai-50 text-maasai-700", text: "We couldn't verify your store. Fix the details below and send it again." },
};

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  // The Seller centre opens only after an admin verifies the application.
  if (!v || v.status === "pending" || v.status === "rejected") redirect("/marketplace/join/seller");
  const db = await getDb();
  const toShip = (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orderItems.vendorId, v.id), inArray(s.orderItems.fulfilment, ["pending", "processing"]), sql`${s.orders.status} not in ('pending_payment','cancelled','refunded')`))
  )[0].n;
  const st = STATUS[v.status];
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Seller centre</p>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
            {v.storeName.replace(" (demo)", "")}
            <span className={`rounded-full px-2.5 py-1 font-display text-xs font-semibold ${st.cls}`}>{st.label}</span>
          </h1>
        </div>
        {v.status === "verified" && (
          <Link href={`/marketplace/store/${v.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-display text-sm font-semibold shadow-card">
            <ExternalLink className="h-4 w-4" /> View my store
          </Link>
        )}
      </div>
      {st.text && <p className={`mb-4 rounded-2xl p-3 text-sm ${st.cls}`}>{st.text}{v.note && v.note !== "demo" ? ` Note from Tembea: ${v.note}` : ""}</p>}
      <WorkspaceTabs
        tabs={[
          { href: "/vendor", label: "Overview", icon: "overview", exact: true },
          { href: "/vendor/products", label: "Products", icon: "products" },
          { href: "/vendor/orders", label: "Orders", icon: "orders", badge: toShip },
          { href: "/vendor/earnings", label: "Earnings", icon: "earnings" },
          { href: "/vendor/store", label: "Store settings", icon: "settings" },
        ]}
      />
      {children}
    </div>
  );
}
