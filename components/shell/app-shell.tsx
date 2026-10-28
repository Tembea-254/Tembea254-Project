"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Crown, LogOut, MoreHorizontal, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMounted, useProfile } from "@/lib/hooks/store";
import { Logo, LogoMark } from "./logo";
import { NAV, isActive } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The VR player is fully immersive: no chrome.
  const immersive = /^\/vr\/[^/]+/.test(pathname);
  if (immersive) return <>{children}</>;
  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <Sidebar pathname={pathname} />
      <MobileTopBar />
      <main className="pb-28 lg:pb-12">{children}</main>
      <MobileNav pathname={pathname} />
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const [profile] = useProfile();
  const mounted = useMounted();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-ink/[0.06] bg-white px-4 pb-5 pt-6 lg:flex">
      <Link href="/dashboard" className="px-2">
        <Logo />
      </Link>
      <div className="mt-2 h-1 w-24 rounded-full bg-kenya-stripe px-2 opacity-90 [margin-left:3.6rem]" />
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-[14.5px] font-medium transition-colors",
                active ? "text-ink" : "text-ink-muted hover:bg-sand-50 hover:text-ink",
              )}
            >
              {active && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-2xl bg-savanna-50" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-xl transition-colors",
                  active ? "bg-savanna-500 text-white" : "bg-sand-100 text-ink-soft group-hover:bg-white",
                )}
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <span className="relative flex-1">{item.label}</span>
              {item.soon && <span className="relative rounded-full bg-ochre-50 px-2 py-0.5 text-[10px] font-semibold text-ochre-600">Soon</span>}
            </Link>
          );
        })}
      </nav>

      {mounted && !profile.premium && (
        <Link href="/profile#premium" className="mb-4 block overflow-hidden rounded-3xl bg-ink p-4 text-white">
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Crown className="h-4 w-4 text-ochre-400" /> Tembea Premium
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/70">Full-length 360° previews, unlimited AI plans and offline trips.</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-ochre-400 px-3 py-1.5 font-display text-xs font-semibold text-ink">
            <Sparkles className="h-3.5 w-3.5" /> Try it free
          </span>
        </Link>
      )}

      <UserChip />
    </aside>
  );
}

function UserChip() {
  const { data } = useSession();
  const [profile] = useProfile();
  const mounted = useMounted();
  const name = data?.user?.name || (mounted ? profile.name : "Traveller");
  return (
    <div className="flex items-center gap-2 rounded-2xl p-1.5 hover:bg-sand-50">
      <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} image={data?.user?.image} />
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-ink-muted">{data?.user?.email || (mounted && profile.premium ? "Premium member" : "Free plan")}</span>
        </span>
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-maasai-50 hover:text-maasai-500"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Avatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" referrerPolicy="no-referrer" className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)} />;
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-savanna-100 font-display font-bold text-savanna-700", className)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/[0.06] bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <LogoMark className="h-8 w-8" />
        <span className="font-display text-lg font-bold">
          tembea<span className="text-savanna-500">254</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <MobileMore />
        <MobileUser />
      </div>
    </header>
  );
}

function MobileMore() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const more = NAV.filter((n) => ["/translator", "/safety", "/profile"].includes(n.href));
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-full border border-ink/10" aria-label="More pages" aria-expanded={open}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-52 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-ink/10">
          {more.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-sm font-semibold hover:bg-sand-50">
              <n.icon className="h-4 w-4 text-ink-muted" /> {n.label}
            </Link>
          ))}
          <Link href="/blog" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-sm font-semibold hover:bg-sand-50">
            <BookOpen className="h-4 w-4 text-ink-muted" /> Blog
          </Link>
        </div>
      )}
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const items = NAV.filter((n) => ["/dashboard", "/vr", "/planner", "/community", "/marketplace"].includes(n.href));
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-ink/[0.06] bg-white/95 p-1.5 shadow-lift backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl py-2 font-display text-[10.5px] font-semibold",
                  active ? "bg-savanna-50 text-savanna-700" : "text-ink-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileUser() {
  const { data } = useSession();
  return (
    <Link href="/profile" aria-label="Profile">
      <Avatar name={data?.user?.name || "T"} image={data?.user?.image} className="h-9 w-9" />
    </Link>
  );
}
