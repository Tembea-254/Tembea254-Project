export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { demoEnabled, facebookEnabled, googleEnabled } from "@/lib/auth";

/** Tells the login modal which sign-in methods are configured on this server. */
export function GET() {
  return NextResponse.json({ google: googleEnabled, facebook: facebookEnabled, demo: demoEnabled });
}
