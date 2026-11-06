import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { newId } from "@/lib/db/ids";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Development uploads: saves into public/uploads. Disabled on Vercel (use Blob storage there). */
export async function POST(req: Request) {
  if (process.env.VERCEL) return NextResponse.json({ error: "Uploads need Vercel Blob storage on this server." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to upload." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!/^(image|video)\//.test(file.type)) return NextResponse.json({ error: "Only photos and videos" }, { status: 400 });
  if (file.size > 300 * 1024 * 1024) return NextResponse.json({ error: "File is larger than 300 MB" }, { status: 413 });
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const name = `${newId()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
