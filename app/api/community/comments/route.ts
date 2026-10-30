import { and, asc, eq } from "drizzle-orm";
import { handler, json } from "@/lib/api";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const postId = new URL(req.url).searchParams.get("postId") || "";
  const db = await getDb();
  const rows = await db
    .select({ c: schema.comments, name: schema.users.name, image: schema.users.image, handle: schema.users.handle })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(eq(schema.comments.postId, postId), eq(schema.comments.status, "visible")))
    .orderBy(asc(schema.comments.createdAt))
    .limit(200);
  return json({ comments: rows.map(({ c, name, image, handle }) => ({ id: c.id, author: name || "Traveller", authorImage: image ?? undefined, handle, text: c.text, createdAt: c.createdAt.getTime() })) });
});
