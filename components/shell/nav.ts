import { Clapperboard, HandCoins, Headset, Home, Languages, LayoutDashboard, Route, ShieldAlert, ShoppingBag, Store, UserRound, Users, type LucideIcon } from "lucide-react";

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
  { href: "/community", label: "Community", short: "Community", icon: Users },
  { href: "/marketplace", label: "Marketplace", short: "Market", icon: ShoppingBag },
  { href: "/safety", label: "Safety & Alerts", short: "Safety", icon: ShieldAlert },
  { href: "/profile", label: "Profile & Settings", short: "Profile", icon: UserRound },
];

export interface WorkspaceLink extends NavItem {
  /** "In review" style pill for applications that are not approved yet */
  pill?: string;
  dark?: boolean;
}

/**
 * Workspaces under the main tabs. Seller centre and Creator studio appear only once an
 * admin approves the user's application; while it's in review a muted "In review" link shows.
 */
export function workspaceLinks(a: { seller: string; creator: string; admin: boolean } | undefined): WorkspaceLink[] {
  if (!a) return [];
  const out: WorkspaceLink[] = [];
  if (a.seller === "verified" || a.seller === "suspended") out.push({ href: "/vendor", label: "Seller centre", short: "Sell", icon: Store });
  else if (a.seller === "pending") out.push({ href: "/marketplace/join/seller", label: "Seller centre", short: "Sell", icon: Store, pill: "In review" });
  if (a.creator === "approved" || a.admin) out.push({ href: "/creators", label: "Creator studio", short: "Create", icon: Clapperboard });
  else if (a.creator === "pending") out.push({ href: "/marketplace/join/creator", label: "Creator studio", short: "Create", icon: Clapperboard, pill: "In review" });
  if (a.admin) out.push({ href: "/admin", label: "Admin control centre", short: "Admin", icon: LayoutDashboard, dark: true });
  return out;
}

/** Shown when the user has no workspace yet: the invitation to apply. */
export const EARN_LINK: NavItem = { href: "/marketplace/join", label: "Earn with Tembea", short: "Earn", icon: HandCoins };

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");
