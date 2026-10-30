import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ExternalLink, Plus, Search } from "lucide-react";
import { AdminMobileMenu, AdminSidebar } from "@/components/admin/admin-nav";
import { adminQueues } from "@/lib/repo/admin-queues";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Tembea254" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me) redirect("/?callbackUrl=/admin");
  if (me.role !== "admin") redirect("/dashboard");
  const q = await adminQueues();
  const approvals = q.vendors + q.creatorApps + q.products + q.submissions + q.live + q.providerApps;
  const badges = {
    "/admin/approvals": approvals,
    "/admin/shop": q.ordersToShip,
    "/admin/creators": q.submissions + q.live,
    "/admin/reviews": q.reviews,
    "/admin/community": q.reports,
    "/admin/payments": q.payouts,
    "/admin/marketplace": q.providerApps,
  };
  const waiting = approvals + q.reviews + q.reports + q.payouts;
  return (
    <div className="min-h-dvh bg-sand-50 lg:pl-[264px]">
      <AdminSidebar badges={badges} name={me.name} email={me.email} />
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-sand-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <AdminMobileMenu badges={badges} name={me.name} email={me.email} />
          <form action="/admin/search" className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input name="q" placeholder="Search users, sellers, orders, products…" aria-label="Search the control centre" className="h-10 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-savanna-500" />
          </form>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl bg-savanna-500 px-3 font-display text-sm font-semibold text-white hover:bg-savanna-600 [&::-webkit-details-marker]:hidden">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
              </summary>
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-ink/10">
                {[
                  ["/admin/blog/edit", "Blog story"],
                  ["/admin/safety", "Safety alert"],
                  ["/admin/vr", "360° scene"],
                  ["/admin/translator", "Translator phrase"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-sand-50">
                    {label}
                  </Link>
                ))}
              </div>
            </details>
            <Link href="/admin/approvals" className="relative grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white hover:bg-sand-50" aria-label={`${waiting} items need attention`}>
              <Bell className="h-[18px] w-[18px]" />
              {waiting > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-maasai-500 px-1 text-[10px] font-bold text-white">{waiting > 99 ? "99+" : waiting}</span>}
            </Link>
            <Link href="/dashboard" className="hidden h-10 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-sm font-semibold hover:bg-sand-50 sm:inline-flex">
              <ExternalLink className="h-4 w-4" /> View app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
