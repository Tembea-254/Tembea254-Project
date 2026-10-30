import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Checkout } from "@/components/shop/checkout";
import { currentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [me, settings] = await Promise.all([currentUser(), getSettings()]);
  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/marketplace" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Keep shopping
      </Link>
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">Checkout</h1>
      <Checkout me={{ name: me?.name ?? "", phone: me?.phone ?? "" }} fees={{ home: settings.deliveryFeeKes, nairobi: settings.deliveryNairobiKes, pickup: settings.pickupFeeKes, freeOver: settings.freeDeliveryOverKes }} />
    </div>
  );
}
