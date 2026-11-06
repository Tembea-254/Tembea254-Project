"use client";

/**
 * Upload a photo or video and get back its public URL.
 * Uses Vercel Blob in production (direct-to-storage, fine for large videos) and the
 * local /public/uploads folder in development.
 */
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const { mode } = (await fetch("/api/upload").then((r) => r.json())) as { mode: "blob" | "local" | "none" };
  if (mode === "none") throw new Error("Uploads aren't switched on yet — connect Vercel Blob storage.");
  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const safe = file.name.replace(/[^\w.\-]+/g, "-").slice(-80);
    const res = await upload(`tembea/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
    });
    return res.url;
  }
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/local");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 300) reject(new Error(d.error || "Upload failed"));
        else resolve(d.url);
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(fd);
  });
}

/** Shrinks photos in the browser before upload (max 1600px, JPEG). Videos are returned unchanged. */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const max = 1600;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}
