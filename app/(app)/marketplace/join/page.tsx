import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EarnInvite } from "@/components/shop/earn-invite";
import { workspaceAccess } from "@/lib/repo/workspaces";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Earn with Tembea254" };

export default async function JoinPage() {
  const me = await requireUser();
  const a = await workspaceAccess(me);
  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Marketplace
      </Link>
      <EarnInvite state={{ seller: a.seller, creator: a.creator }} />
      <p className="mt-6 text-center text-sm text-ink-muted">You can do both — sell and create. Each needs its own short application.</p>
    </div>
  );
}
