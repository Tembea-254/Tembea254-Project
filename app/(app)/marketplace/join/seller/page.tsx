import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Flash } from "@/components/shell/workspace-tabs";
import { ApplicationStatus } from "@/components/shop/application-status";
import { VendorApply } from "@/components/shop/vendor-apply";
import { HUB_NAMES } from "@/lib/data/shop";
import { myVendor } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sell on Tembea254" };

const TYPE: Record<string, string> = { maker: "Products I make", pro: "My services", both: "Products and services" };

export default async function JoinSeller({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const [v, settings] = await Promise.all([myVendor(me.id), getSettings()]);
  if (v && (v.status === "verified" || v.status === "suspended")) redirect("/vendor");
  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/marketplace/join" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Earn with Tembea254
      </Link>
      <Flash {...searchParams} />
      {v?.status === "pending" ? (
        <ApplicationStatus
          kind="seller"
          submittedAt={v.createdAt}
          summary={[
            { label: "Store", value: v.storeName },
            { label: "Selling", value: TYPE[v.sellerType] ?? v.sellerType },
            { label: "Based in", value: v.location },
            { label: "Area served", value: v.hub ? HUB_NAMES[v.hub] ?? v.hub : "" },
            { label: "Phone", value: v.phone },
          ]}
        />
      ) : (
        <>
          {v?.status === "rejected" && (
            <p role="alert" className="mb-4 rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">
              We couldn&apos;t approve your store yet.{v.note && v.note !== "demo" ? ` Note from Tembea: ${v.note}` : ""} Fix the details below and send it again.
            </p>
          )}
          <VendorApply v={v ?? null} commission={settings.commissionDefault} />
        </>
      )}
    </div>
  );
}
