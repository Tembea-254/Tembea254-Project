import { withAuth } from "next-auth/middleware";

/**
 * App pages need a session; /admin also needs the admin role.
 * (The landing page, blog, shop catalogue and APIs stay public — APIs check permissions themselves.)
 */
export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || "tembea254-dev-secret-change-me",
  pages: { signIn: "/" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token || token.status === "suspended") return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role === "admin";
      return true;
    },
  },
});

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
    "/orders/:path*",
    "/checkout/:path*",
  ],
};
