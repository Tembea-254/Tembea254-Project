import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

/** Where uploads go: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, else the local /public/uploads folder (dev). */
export async function GET() {
  return NextResponse.json({ mode: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : process.env.VERCEL ? "none" : "local" });
}

/** Vercel Blob client-upload handshake: the browser uploads straight to Blob storage (handles large videos). */
export async function POST(req: Request) {
  const b = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body: b,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await currentUser();
        if (!user) throw new Error("Please sign in to upload.");
        return { allowedContentTypes: [...IMAGE, ...VIDEO], maximumSizeInBytes: 500 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ userId: user.id }) };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
