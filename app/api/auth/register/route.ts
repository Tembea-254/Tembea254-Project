import { NextResponse } from "next/server";
import { StorageNotConfigured } from "@/lib/kv";
import { createUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters for your password" }, { status: 400 });
  try {
    await createUser(body.name || "", email, password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "EMAIL_TAKEN") return NextResponse.json({ error: "An account with this email already exists — log in instead" }, { status: 409 });
    if (e instanceof StorageNotConfigured)
      return NextResponse.json({ error: "Email sign-up isn't available yet on this site. Please continue with Google for now.", code: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
    console.error("[auth] register failed", e);
    return NextResponse.json({ error: "Couldn't create your account. Try again." }, { status: 500 });
  }
}
