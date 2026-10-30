"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeft,
  BadgeDollarSign,
  BookOpen,
  Clapperboard,
  Gauge,
  Headset,
  Inbox,
  Languages,
  Menu,
  MessagesSquare,
  Route,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shell/logo";

export const ADMIN_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge, exact: true },
      { href: "/admin/approvals", label: "Approvals inbox", icon: Inbox },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/shop", label: "Sellers, products & orders", icon: Store },
      { href: "/admin/payments", label: "Payments & payouts", icon: BadgeDollarSign },
      { href: "/admin/marketplace", label: "Hire requests", icon: ShoppingBag },
    ],
  },
  {
    label: "Travel content",
    items: [
      { href: "/admin/trips", label: "AI trip planner", icon: Route },
      { href: "/admin/vr", label: "360° pre-visits", icon: Headset },
      { href: "/admin/creators", label: "Creators & live walks", icon: Clapperboard },
      { href: "/admin/translator", label: "Translator", icon: Languages },
      { href: "/admin/blog", label: "Blog & stories", icon: BookOpen },
    ],
  },
  {
    label: "People & trust",
    items: [
      { href: "/admin/users", label: "Users & roles", icon: Users },
      { href: "/admin/community", label: "Community", icon: MessagesSquare },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/safety", label: "Safety alerts", icon: ShieldAlert },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit", label: "Activity log", icon: Activity },
    ],
  },
];
export const ADMIN_NAV = ADMIN_GROUPS.flatMap((g) => g.items);

function NavList({ badges, onNavigate }: { badges: Record<string, number>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const on = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav className="space-y-5" aria-label="Admin sections">
      {ADMIN_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 font-display text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const active = on(n.href, "exact" in n ? n.exact : false);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2 font-display text-[13.5px] font-medium transition-colors",
                    active ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  {active && <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-savanna-400" />}
                  <n.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-savanna-400" : "")} />
                  <span className="flex-1 truncate">{n.label}</span>
                  {!!badges[n.href] && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ochre-400 px-1.5 text-[10.5px] font-bold text-ink">{badges[n.href]}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Profile({ name, email }: { name: string; email: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-savanna-500 font-display text-sm font-bold text-white">{(name || email).slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold text-white">{name || "Admin"}</span>
          <span className="block truncate text-[11px] text-white/55">{email}</span>
        </span>
      </div>
      <Link href="/dashboard" className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white/85 hover:bg-white/15 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the app
      </Link>
    </div>
  );
}

/** Desktop: the fixed dark sidebar. */
export function AdminSidebar({ badges, name, email }: { badges: Record<string, number>; name: string; email: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-ink px-4 pb-4 pt-5 text-white lg:flex">
      <Link href="/admin" className="flex items-center gap-2 px-2" aria-label="Admin overview">
        <Logo light className="h-8 sm:h-8" />
      </Link>
      <p className="mt-2 px-2 font-display text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ochre-400">Control centre</p>
      <div className="scrollbar-none -mx-1 mt-6 flex-1 overflow-y-auto px-1 pb-4">
        <NavList badges={badges} />
      </div>
      <Profile name={name} email={email} />
    </aside>
  );
}

/** Phones and tablets: a menu button in the top bar that opens the same list as a drawer. */
export function AdminMobileMenu({ badges, name, email }: { badges: Record<string, number>; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 bg-white lg:hidden" aria-label="Open admin menu" aria-expanded={open}>
        <Menu className="h-5 w-5" />
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu" />
            <div className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col bg-ink px-4 pb-4 pt-5 text-white shadow-lift">
              <div className="flex items-center justify-between px-2">
                <Logo light className="h-8 sm:h-8" />
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="scrollbar-none mt-6 flex-1 overflow-y-auto pb-4">
                <NavList badges={badges} onNavigate={() => setOpen(false)} />
              </div>
              <Profile name={name} email={email} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
