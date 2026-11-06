import { desc, eq } from "drizzle-orm";
import { body, handler, json } from "@/lib/api";
import { SAMPLE_REVIEWS, showSampleReviews, type Review } from "@/lib/data/reviews";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Approved reviews (+ design samples in development). */
export const GET = handler(async () => {
  const db = await getDb();
  const rows = await db.select().from(schema.reviews).where(eq(schema.reviews.status, "approved")).orderBy(desc(schema.reviews.createdAt)).limit(30);
  const reviews: Review[] = rows.map((r) => ({ id: r.id, name: r.name, from: r.from, trip: r.trip, placeImage: r.placeImage, rating: r.rating, text: r.text, createdAt: r.createdAt.getTime(), approved: true }));
  return json({ reviews: [...reviews, ...(showSampleReviews() ? SAMPLE_REVIEWS : [])] });
});

/** Signed-in travellers submit a review; it waits for an admin, who can reward tokens on approval. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const b = await body<Partial<Review>>(req);
  const text = String(b.text || "").trim();
  const rating = Math.round(Number(b.rating));
  if (text.length < 20) throw new HttpError(400, "Tell us a little more (20+ characters).");
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, "Choose a rating from 1 to 5.");
  const db = await getDb();
  await db.insert(schema.reviews).values({
    id: newId("r_"),
    userId: user.id,
    name: (user.name || "Traveller").split(" ")[0],
    from: String(b.from || "").slice(0, 40),
    trip: String(b.trip || "").slice(0, 60),
    placeImage: String(b.placeImage || "photo-1518459384564-ecfd8e80721f"),
    rating,
    text: text.slice(0, 600),
  });
  return json({ ok: true, pending: true });
});
