import type { Metadata } from "next";
import { MarketHome } from "@/components/shop/market-home";
import { listProducts, listStores } from "@/lib/repo/shop";
import { workspaceAccess } from "@/lib/repo/workspaces";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Marketplace", description: "Shop Kenyan-made goods and book local drivers, guides, photographers and artists — all verified by Tembea254." };
export const dynamic = "force-dynamic";

export default async function MarketplacePage({ searchParams }: { searchParams: { q?: string; tab?: string; type?: string } }) {
  const [stores, listings, access] = await Promise.all([listStores(), listProducts(), currentUser().then((u) => workspaceAccess(u))]);
  const type = searchParams.type || (searchParams.tab === "hire" ? "service" : "");
  return (
    <div className="container-page py-5 sm:py-8">
      <MarketHome stores={stores} listings={listings} initialQ={searchParams.q ?? ""} initialType={type} join={{ seller: access.seller, creator: access.creator }} />
    </div>
  );
}
