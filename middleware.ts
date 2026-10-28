import { withAuth } from "next-auth/middleware";

/** Everything inside the app requires a session; the landing page and APIs stay public. */
export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || "tembea254-dev-secret-change-me",
  pages: { signIn: "/" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/vr/:path*", "/planner/:path*", "/translator/:path*", "/marketplace/:path*", "/community/:path*", "/safety/:path*", "/profile/:path*"],
};
