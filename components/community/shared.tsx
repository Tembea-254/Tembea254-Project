"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { Media } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { mediaUrl } from "../shop/media";

export function ago(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function Avatar({ name, image, size = 40, ring, className }: { name: string; image?: string | null; size?: number; ring?: boolean; className?: string }) {
  const style = { width: size, height: size };
  const inner = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(image, size * 2, size * 2)} alt="" referrerPolicy="no-referrer" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={{ ...style, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-savanna-400 to-ink font-display font-bold text-white">
      {(name || "T").slice(0, 1).toUpperCase()}
    </span>
  );
  if (!ring) return <span className={cn("inline-flex", className)}>{inner}</span>;
  return <span className={cn("inline-flex rounded-full bg-gradient-to-tr from-ochre-400 via-maasai-500 to-savanna-500 p-[2.5px]", className)}><span className="rounded-full bg-white p-[2px]">{inner}</span></span>;
}

/** Caption text with clickable #hashtags and @handles. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]{2,40}|@[a-z0-9_.]{3,24})/giu);
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {parts.map((p, i) =>
        p.startsWith("#") ? (
          <Link key={i} href={`/community?tag=${encodeURIComponent(p.slice(1).toLowerCase())}`} className="font-medium text-savanna-700 hover:underline">
            {p}
          </Link>
        ) : p.startsWith("@") ? (
          <Link key={i} href={`/community/u/${p.slice(1).toLowerCase()}`} className="font-medium text-dusk-700 hover:underline">
            {p}
          </Link>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </p>
  );
}

export async function fetchFile(m: Media, i: number) {
  const url = mediaUrl(m.url, 1600);
  const blob = await fetch(url).then((r) => r.blob());
  const ext = m.type === "video" ? (blob.type.split("/")[1] || "mp4").replace("quicktime", "mov") : "jpg";
  return new File([blob], `tembea254-${i + 1}.${ext}`, { type: blob.type || (m.type === "video" ? "video/mp4" : "image/jpeg") });
}

export async function downloadMedia(media: Media[]) {
  for (let i = 0; i < media.length; i++) {
    try {
      const f = await fetchFile(media[i], i);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      window.open(mediaUrl(media[i].url, 1600), "_blank");
    }
  }
}

export const postUrl = (id: string) => (typeof window !== "undefined" ? `${window.location.origin}/community/p/${id}` : `/community/p/${id}`);

export async function act(body: Record<string, unknown>) {
  const r = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}
