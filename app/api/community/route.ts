import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SEED_POSTS, type Post, type PostComment } from "@/lib/data/community";
import { newId, readJSON, writeJSON } from "@/lib/json-store";

export const dynamic = "force-dynamic";

const FILE = "community.json";
const MAX_IMAGE = 450_000; // ~450 KB data URL (images are compressed in the browser first)

async function load(): Promise<Post[]> {
  const stored = await readJSON<Post[] | null>(FILE, null);
  return stored ?? SEED_POSTS;
}

function view(p: Post, me?: string | null) {
  const { likes, ...rest } = p;
  return { ...rest, likeCount: likes.length, liked: !!me && likes.includes(me) };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const me = session?.user?.email ?? null;
  const posts = (await load()).sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ posts: posts.map((p) => view(p, me)) });
}

/** One endpoint, three actions: create a post, toggle a like, add a comment. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.email) return NextResponse.json({ error: "Please sign in to join the community." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const posts = await load();
  const author = { name: user.name || user.email.split("@")[0], image: user.image || undefined };

  if (body.action === "post") {
    const text = String(body.text || "").trim().slice(0, 1200);
    const image = typeof body.image === "string" && body.image.startsWith("data:image/") && body.image.length <= MAX_IMAGE ? body.image : undefined;
    if (!text && !image) return NextResponse.json({ error: "Write something or add a photo." }, { status: 400 });
    const post: Post = {
      id: newId("p_"),
      author: author.name,
      authorImage: author.image,
      authorEmail: user.email,
      placeId: typeof body.placeId === "string" ? body.placeId.slice(0, 40) : undefined,
      kind: body.kind === "tip" || body.kind === "question" ? body.kind : "update",
      text,
      image,
      likes: [],
      comments: [],
      createdAt: Date.now(),
    };
    await writeJSON(FILE, [post, ...posts]);
    return NextResponse.json({ post: view(post, user.email) });
  }

  const post = posts.find((p) => p.id === body.id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  if (body.action === "like") {
    post.likes = post.likes.includes(user.email) ? post.likes.filter((e) => e !== user.email) : [...post.likes, user.email];
  } else if (body.action === "comment") {
    const text = String(body.text || "").trim().slice(0, 500);
    if (!text) return NextResponse.json({ error: "Comment is empty." }, { status: 400 });
    const c: PostComment = { id: newId("c_"), author: author.name, authorImage: author.image, text, createdAt: Date.now() };
    post.comments.push(c);
  } else if (body.action === "delete") {
    if (post.authorEmail !== user.email) return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 });
    await writeJSON(
      FILE,
      posts.filter((p) => p.id !== post.id),
    );
    return NextResponse.json({ deleted: true });
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  await writeJSON(FILE, posts);
  return NextResponse.json({ post: view(post, user.email) });
}
