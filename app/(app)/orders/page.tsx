import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { Package } from "lucide-react";
import { mediaUrl } from "@/components/shop/media";
import { ORDER_STATUS_LABEL } from "@/lib/data/shop";
import { getDb, schema as s } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const me = await requireUser();
  const db = await getDb();
  const orders = await db.select().from(s.orders).where(eq(s.orders.userId, me.id)).orderBy(desc(s.orders.createdAt)).limit(50);
  const items = orders.length ? await db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, orders.map((o) => o.id))) : [];
  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">My orders</h1>
      {!orders.length && (
        <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center text-ink-muted">
          <Package className="mx-auto h-10 w-10" />
          <p className="mt-3">No orders yet.</p>
          <Link href="/marketplace?tab=shop" className="mt-4 inline-flex h-11 items-center rounded-full bg-savanna-500 px-5 font-display font-semibold text-white">
            Shop Kenyan-made
          </Link>
        </div>
      )}
      <ul className="space-y-3">
        {orders.map((o) => {
          const its = items.filter((i) => i.orderId === o.id);
          return (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card hover:shadow-lift">
                <div className="flex -space-x-3">
                  {its.slice(0, 3).map((i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i.id} src={mediaUrl(i.image, 120, 120)} alt="" className="h-12 w-12 rounded-xl border-2 border-white object-cover" />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{its.map((i) => i.title).join(", ")}</p>
                  <p className="text-xs text-ink-muted">{new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {money(o.total)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
