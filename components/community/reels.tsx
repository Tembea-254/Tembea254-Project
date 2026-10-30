"use client";

import Link from "next/link";
import { Bookmark, Heart, Loader2, MapPin, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { FeedPost } from "@/lib/repo/community";
import { cn } from "@/lib/utils";
import { mediaUrl } from "../shop/media";
import { FollowButton, TaggedListing } from "./post-card";
import { ShareSheet } from "./share-sheet";
import { Avatar, RichText } from "./shared";

/**
 * TikTok-style vertical feed. Videos first; photo posts join in with a slow Ken Burns pan
 * so the reel never runs dry. Swipe or scroll; each reel snaps into place and plays on its own.
 */
export function Reels({ run, flash, onOpenComments }: { run: (b: Record<string, unknown>) => Promise<any>; flash: (m: string) => void; onOpenComments: (p: FeedPost) => void }) {
  const [items, setItems] = useState<FeedPost[] | null>(null);
  const [next, setNext] = useState<{ videos: string | null; photos: string | null }>({ videos: null, photos: null });
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async (cursor?: { videos: string | null; photos: string | null }) => {
    setLoading(true);
    const get = (f: string, c?: string | null) => fetch(`/api/community?filter=${f}${c ? `&cursor=${encodeURIComponent(c)}` : ""}`).then((r) => r.json()).catch(() => ({ posts: [], next: null }));
    const [v, p] = await Promise.all([cursor && !cursor.videos ? { posts: [], next: null } : get("reels", cursor?.videos), cursor && !cursor.photos ? { posts: [], next: null } : get("photos", cursor?.photos)]);
    const photos = (p.posts as FeedPost[]).filter((x) => !x.media.some((m) => m.type === "video"));
    setItems((all) => {
      const merged = [...(all ?? []), ...(v.posts as FeedPost[]), ...photos];
      return merged.filter((x, i) => merged.findIndex((y) => y.id === x.id) === i);
    });
    setNext({ videos: v.next, photos: p.next });
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, p: Partial<FeedPost>) => setItems((all) => all?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? null);

  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget;
        if (!loading && (next.videos || next.photos) && el.scrollTop + el.clientHeight * 2 > el.scrollHeight) load(next);
      }}
      className="scrollbar-none -mx-4 h-[calc(100dvh-178px)] snap-y snap-mandatory overflow-y-auto bg-black sm:mx-auto sm:max-w-[440px] sm:rounded-[1.75rem] lg:h-[calc(100dvh-150px)]"
    >
      {items === null && (
        <div className="grid h-full place-items-center text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {items?.length === 0 && <div className="grid h-full place-items-center p-8 text-center text-white/80">No reels yet. Post a video from your trip and it shows up here.</div>}
      {items?.map((p) => (
        <Reel key={p.id} p={p} muted={muted} setMuted={setMuted} run={run} flash={flash} patch={(x) => patch(p.id, x)} onComments={() => onOpenComments(p)} />
      ))}
    </div>
  );
}

function Reel({ p, muted, setMuted, run, flash, patch, onComments }: { p: FeedPost; muted: boolean; setMuted: (m: boolean) => void; run: (b: Record<string, unknown>) => Promise<any>; flash: (m: string) => void; patch: (p: Partial<FeedPost>) => void; onComments: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [burst, setBurst] = useState(0);
  const [share, setShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const last = useRef(0);
  const viewed = useRef(false);
  const m = p.media.find((x) => x.type === "video") ?? p.media[0];
  const place = p.placeId ? PLACE_BY_ID[p.placeId] : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.intersectionRatio > 0.7), { threshold: [0, 0.7, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = vid.current;
    if (active && !viewed.current) {
      viewed.current = true;
      fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view", id: p.id }) }).catch(() => {});
    }
    if (!v) return;
    if (active && !paused) v.play().catch(() => {});
    else v.pause();
  }, [active, paused, p.id]);

  const like = async (only?: "on") => {
    if (only && p.liked) return;
    patch({ liked: only ? true : !p.liked, likeCount: p.likeCount + (only || !p.liked ? 1 : -1) });
    const d = await run({ action: "like", id: p.id, only });
    if (d) patch({ liked: d.liked, likeCount: d.likeCount });
  };

  return (
    <section ref={ref} className="relative h-full w-full snap-start snap-always overflow-hidden">
      <div
        className="absolute inset-0"
        onClick={() => {
          const now = Date.now();
          if (now - last.current < 280) {
            setBurst((b) => b + 1);
            like("on");
          } else setTimeout(() => Date.now() - last.current >= 280 && m?.type === "video" && setPaused((x) => !x), 300);
          last.current = now;
        }}
      >
        {m?.type === "video" ? (
          <video ref={vid} src={m.url} poster={m.poster} muted={muted} loop playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          m && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(m.url, 1080, 1920)} alt="" className={cn("h-full w-full object-cover", active && "animate-kenburns")} />
          )
        )}
      </div>
      {burst > 0 && (
        <span key={burst} className="pointer-events-none absolute inset-0 grid place-items-center">
          <Heart className="h-32 w-32 animate-heart fill-white text-white drop-shadow-xl" />
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

      {m?.type === "video" && (
        <button onClick={() => setMuted(!muted)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {/* actions */}
      <div className="absolute bottom-28 right-2 flex flex-col items-center gap-4 text-white">
        <ReelBtn label={p.likeCount} onClick={() => like()} aria={p.liked ? "Unlike" : "Like"}>
          <Heart className={cn("h-8 w-8 drop-shadow", p.liked && "animate-bump fill-maasai-500 text-maasai-500")} />
        </ReelBtn>
        <ReelBtn label={p.commentCount} onClick={onComments} aria="Comments">
          <MessageCircle className="h-8 w-8 drop-shadow" />
        </ReelBtn>
        <ReelBtn
          label={p.saved ? "Saved" : "Save"}
          onClick={async () => {
            patch({ saved: !p.saved });
            const d = await run({ action: "save", id: p.id });
            if (d) patch({ saved: d.saved });
          }}
          aria="Save"
        >
          <Bookmark className={cn("h-8 w-8 drop-shadow", p.saved && "fill-white")} />
        </ReelBtn>
        <ReelBtn label={p.shareCount || "Share"} onClick={() => setShare(true)} aria="Share">
          <Send className="h-8 w-8 -rotate-12 drop-shadow" />
        </ReelBtn>
      </div>

      {/* caption */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 pr-20 text-white">
        <div className="flex items-center gap-2">
          <Link href={p.author.handle ? `/community/u/${p.author.handle}` : "#"} className="flex min-w-0 items-center gap-2">
            <Avatar name={p.author.name} image={p.author.image} size={36} />
            <span className="truncate font-display text-sm font-semibold">{p.author.name.replace(" (demo)", "")}</span>
          </Link>
          {!p.mine && !p.following && p.author.handle && <FollowButton userId={p.author.id} initial={false} small run={run} onChange={(f) => patch({ following: f })} />}
        </div>
        {p.text && <RichText text={p.text.length > 160 ? p.text.slice(0, 160) + "…" : p.text} className="text-sm leading-snug text-white/95 [&_a]:text-white [&_a]:underline" />}
        {place && (
          <Link href={`/community/place/${place.id}`} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            <MapPin className="h-3.5 w-3.5" /> {place.name}
          </Link>
        )}
        {p.product && <TaggedListing p={p.product} dark />}
      </div>
      <ShareSheet post={p} open={share} onClose={() => setShare(false)} flash={flash} onShared={() => patch({ shareCount: p.shareCount + 1 })} />
    </section>
  );
}

function ReelBtn({ children, label, onClick, aria }: { children: React.ReactNode; label: React.ReactNode; onClick: () => void; aria: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={aria}
      className="flex flex-col items-center gap-0.5 transition-transform active:scale-90"
    >
      {children}
      <span className="text-xs font-semibold drop-shadow">{label || ""}</span>
    </button>
  );
}
