import { notFound } from "next/navigation";
import { ProductView } from "@/components/shop/product-view";
import { getProduct } from "@/lib/repo/shop";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const r = await getProduct(params.id);
  return { title: r ? r.product.title : "Listing", description: r?.product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [r, settings] = await Promise.all([getProduct(params.id), getSettings()]);
  if (!r) notFound();
  const { product: p, vendor: v } = r;
  return (
    <div className="container-page py-5 sm:py-8">
      <ProductView
        product={{
          id: p.id,
          kind: p.kind,
          title: p.title,
          description: p.description,
          price: p.price,
          compareAt: p.compareAt,
          stock: p.stock,
          images: p.images,
          category: p.category,
          serviceType: p.serviceType,
          hub: p.hub,
          unit: p.unit,
          languages: p.languages,
          capacity: p.capacity,
          madeIn: p.madeIn,
          tags: p.tags,
          express: p.fulfilledBy === "tembea",
          rating: p.ratingAvg,
          ratingCount: p.ratingCount,
          sold: p.salesCount,
        }}
        store={{ slug: v.slug, storeName: v.storeName, logo: v.logo, location: v.location, demo: v.note === "demo", sellerType: v.sellerType, since: v.createdAt.getTime() }}
        score={r.score}
        reviews={r.reviews}
        more={r.more}
        similar={r.similar}
        posts={r.posts as never}
        fees={{ home: settings.deliveryFeeKes, nairobi: settings.deliveryNairobiKes, pickup: settings.pickupFeeKes, freeOver: settings.freeDeliveryOverKes }}
        returnDays={settings.returnWindowDays}
      />
    </div>
  );
}
