import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Heart } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { getDb, schema as s } from "@/lib/db";
import { listProducts } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const me = await requireUser();
  const db = await getDb();
  const ids = (await db.select({ id: s.wishlist.productId }).from(s.wishlist).where(eq(s.wishlist.userId, me.id)).orderBy(desc(s.wishlist.createdAt))).map((r) => r.id);
  const items = ids.length ? await listProducts({ ids }) : [];
  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/marketplace" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Marketplace
      </Link>
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">Saved for later</h1>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center text-ink-muted">
          <Heart className="mx-auto h-8 w-8" />
          <p className="mt-2">Tap the heart on anything you like and it lands here.</p>
        </div>
      )}
    </div>
  );
}
