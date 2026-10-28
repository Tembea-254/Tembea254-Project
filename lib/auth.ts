import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { verifyUser } from "./users";

export const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "tembea254-dev-secret-change-me";

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const facebookEnabled = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
export const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/", error: "/" },
  providers: [
    ...(googleEnabled
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
    ...(facebookEnabled
      ? [FacebookProvider({ clientId: process.env.FACEBOOK_CLIENT_ID!, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! })]
      : []),
    CredentialsProvider({
      id: "email",
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await verifyUser(creds.email, creds.password);
        return user ? { id: user.id, name: user.name, email: user.email } : null;
      },
    }),
    ...(demoEnabled
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Demo",
            credentials: {},
            async authorize() {
              return { id: "demo", name: "Demo Traveller", email: "demo@tembea254.app" };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { provider?: string }).provider = token.provider as string | undefined;
      return session;
    },
  },
};
