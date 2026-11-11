import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/** Marketplace pages are closed while NEXT_PUBLIC_MARKETPLACE is not "on" (creator applications stay open). */
const MARKET_CLOSED = process.env.NEXT_PUBLIC_MARKETPLACE !== "on";
const MARKET_PATHS = /^\/(marketplace|checkout|orders|vendor)(\/|$)/;

/**
 * App pages need a session; /admin also needs the admin role.
 * (The landing page, blog, shop catalogue and APIs stay public — APIs check permissions themselves.)
 */
export default withAuth(
  function middleware(req) {
    const p = req.nextUrl.pathname;
    if (MARKET_CLOSED && MARKET_PATHS.test(p) && !p.startsWith("/marketplace/join/creator")) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  },
  {
  secret: process.env.NEXTAUTH_SECRET || "tembea254-dev-secret-change-me",
  pages: { signIn: "/" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token || token.status === "suspended") return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role === "admin";
      return true;
    },
  },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vr/:path*",
    "/planner/:path*",
    "/translator/:path*",
    "/marketplace/:path*",
    "/community/:path*",
    "/safety/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/vendor/:path*",
    "/creators/:path*",
    "/scouts/:path*",
    "/partner/:path*",
    "/bookings/:path*",
    "/orders/:path*",
    "/checkout/:path*",
  ],
};
