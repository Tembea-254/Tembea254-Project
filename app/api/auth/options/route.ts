export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { demoEnabled, facebookEnabled, googleEnabled } from "@/lib/auth";
import { usingRealPostgres } from "@/lib/db";

/** Tells the login modal which sign-in methods are configured on this server. */
export function GET() {
  const serverless = !!process.env.VERCEL;
  return NextResponse.json({
    google: googleEnabled,
    facebook: facebookEnabled,
    demo: demoEnabled,
    // email accounts need a real database on serverless hosts
    emailSignup: usingRealPostgres || !serverless,
    dev: process.env.NODE_ENV !== "production",
  });
}
