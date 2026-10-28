export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { demoEnabled, facebookEnabled, googleEnabled } from "@/lib/auth";
import { ephemeralFs, kvEnabled } from "@/lib/kv";

/** Tells the login modal which sign-in methods are configured on this server. */
export function GET() {
  return NextResponse.json({
    google: googleEnabled,
    facebook: facebookEnabled,
    demo: demoEnabled,
    // email accounts need somewhere durable to live (Redis on Vercel, files locally)
    emailSignup: kvEnabled || !ephemeralFs,
    dev: process.env.NODE_ENV !== "production",
  });
}
