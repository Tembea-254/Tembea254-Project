import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SAMPLE_REVIEWS, showSampleReviews, type Review } from "@/lib/data/reviews";
import { newId, readJSON, writeJSON } from "@/lib/json-store";

export const dynamic = "force-dynamic";

/** Approved reviews (+ design samples in development). */
export async function GET() {
  const stored = await readJSON<Review[]>("reviews.json", []);
  const approved = stored.filter((r) => r.approved).sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ reviews: [...approved, ...(showSampleReviews() ? SAMPLE_REVIEWS : [])] });
}

/**
 * Signed-in travellers submit a review. It's stored as pending (approved: false);
 * approve it by setting "approved": true in .data/reviews.json (or build an admin screen).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Review>;
  const text = String(body.text || "").trim();
  const rating = Math.round(Number(body.rating));
  if (text.length < 20) return NextResponse.json({ error: "Tell us a little more (20+ characters)." }, { status: 400 });
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  const review: Review = {
    id: newId("r_"),
    name: (session.user.name || "Traveller").split(" ")[0],
    from: String(body.from || "").slice(0, 40),
    trip: String(body.trip || "").slice(0, 60),
    placeImage: String(body.placeImage || "photo-1518459384564-ecfd8e80721f"),
    rating,
    text: text.slice(0, 600),
    createdAt: Date.now(),
    approved: false,
  };
  const all = await readJSON<Review[]>("reviews.json", []);
  await writeJSON("reviews.json", [review, ...all]);
  return NextResponse.json({ ok: true, pending: true });
}
