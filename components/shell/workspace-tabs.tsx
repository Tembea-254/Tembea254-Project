"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Receipt, Settings2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal section tabs for the mini dashboards (vendor, creator). */
const ICONS = { overview: LayoutDashboard, products: Package, orders: Receipt, earnings: Wallet, settings: Settings2 };

export function WorkspaceTabs({ tabs }: { tabs: { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      {tabs.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        const Icon = ICONS[t.icon];
        return (
          <Link key={t.href} href={t.href} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-display text-sm font-semibold transition-colors", on ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card hover:text-ink")}>
            <Icon className="h-4 w-4" /> {t.label}
            {!!t.badge && <span className="rounded-full bg-ochre-400 px-1.5 text-[11px] text-ink">{t.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** A one-line message passed back in the URL (?ok= or ?error=) after a form action. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p role={error ? "alert" : "status"} className={cn("mb-4 rounded-2xl p-3 text-sm", error ? "bg-maasai-50 text-maasai-700" : "bg-savanna-50 text-savanna-700")}>
      {error || ok}
    </p>
  );
}
