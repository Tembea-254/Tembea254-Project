import type { Metadata } from "next";
import { Marketplace } from "@/components/marketplace/marketplace";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Marketplace />
    </div>
  );
}
