import { Headset, Home, Languages, Route, ShieldAlert, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  soon?: boolean;
}

/** Exact tab order from the product brief. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: Home },
  { href: "/vr", label: "VR Experiences", short: "VR", icon: Headset },
  { href: "/planner", label: "AI Trip Planner", short: "Plan", icon: Route },
  { href: "/translator", label: "Translator", short: "Translate", icon: Languages },
  { href: "/marketplace", label: "Marketplace", short: "Market", icon: ShoppingBag, soon: true },
  { href: "/safety", label: "Safety & Alerts", short: "Safety", icon: ShieldAlert, soon: true },
  { href: "/profile", label: "Profile & Settings", short: "Profile", icon: UserRound },
];

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");
