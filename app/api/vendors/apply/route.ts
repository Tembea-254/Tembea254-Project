import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HIRE_CATEGORIES, HUBS } from "@/lib/data/market";
import { newId, readJSON, writeJSON } from "@/lib/json-store";

export const dynamic = "force-dynamic";

/** Vendor applications are stored as pending in .data/vendor-applications.json for the team to verify. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const business = String(b.business || "").trim().slice(0, 80);
  const phone = String(b.phone || "").replace(/[^\d+ ]/g, "").slice(0, 20);
  const about = String(b.about || "").trim().slice(0, 800);
  if (business.length < 2 || phone.replace(/\D/g, "").length < 9 || about.length < 20)
    return NextResponse.json({ error: "Add your business name, a phone number and a short description (20+ characters)." }, { status: 400 });
  const app = {
    id: newId("va_"),
    email: session.user.email,
    name: session.user.name,
    business,
    phone,
    hub: HUBS.some((h) => h.id === b.hub) ? b.hub : "other",
    category: HIRE_CATEGORIES.includes(b.category as never) ? b.category : "Other",
    about,
    status: "pending",
    createdAt: Date.now(),
  };
  const all = await readJSON<unknown[]>("vendor-applications.json", []);
  await writeJSON("vendor-applications.json", [app, ...all]);
  return NextResponse.json({ ok: true });
}
