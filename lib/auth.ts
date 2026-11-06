import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { findUser, getUserById, upsertOAuthUser, verifyUser } from "./users";

export const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "tembea254-dev-secret-change-me";

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const facebookEnabled = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
export const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

/** How often a signed-in session re-reads the user's role/status from the database. */
const REFRESH_MS = 60_000;

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/", error: "/" },
  providers: [
    ...(googleEnabled ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
    ...(facebookEnabled ? [FacebookProvider({ clientId: process.env.FACEBOOK_CLIENT_ID!, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! })] : []),
    CredentialsProvider({
      id: "email",
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await verifyUser(creds.email, creds.password);
        if (!user || user.status === "suspended") return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    ...(demoEnabled
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Demo",
            credentials: {},
            async authorize() {
              const u = await upsertOAuthUser({ email: "demo@tembea254.app", name: "Demo Traveller", provider: "demo" });
              return { id: u.id, name: u.name, email: u.email };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account && (account.provider === "google" || account.provider === "facebook")) {
        const u = await upsertOAuthUser({ email: user.email, name: user.name, image: user.image, provider: account.provider });
        if (u.status === "suspended") return "/?error=Suspended";
        user.id = u.id;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account) token.provider = account.provider;
      if (user) {
        token.uid = user.id;
        token.refreshedAt = 0;
      }
      // keep role/status in sync with the database (admins can change them any time)
      if (token.uid && Date.now() - Number(token.refreshedAt || 0) > REFRESH_MS) {
        try {
          let u = await getUserById(String(token.uid));
          // Sessions from before the database (or after a reset) carry an id it doesn't know: match by email instead.
          if (!u && token.email) {
            u = (await findUser(token.email)) ?? (await upsertOAuthUser({ email: token.email, name: token.name, image: token.picture, provider: String(token.provider || "email") }));
            if (u) token.uid = u.id;
          }
          if (u) {
            token.role = u.role;
            token.status = u.status;
            token.name = u.name || token.name;
          } else {
            token.status = "missing";
          }
          token.refreshedAt = Date.now();
        } catch (e) {
          console.error("[auth] could not refresh user", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; provider?: string; role?: string; status?: string };
        u.id = token.uid as string | undefined;
        u.provider = token.provider as string | undefined;
        u.role = (token.role as string) || "user";
        u.status = (token.status as string) || "active";
      }
      return session;
    },
  },
};
