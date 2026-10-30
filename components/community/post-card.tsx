"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarCheck, Flag, Heart, HelpCircle, Lightbulb, Loader2, MapPin, MessageCircle, MoreHorizontal, Send, Share2, ShieldCheck, ShoppingBag, Star, Store, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/db/schema";
import { PLACE_BY_ID } from "@/lib/data/places";
import { SERVICE_UNITS } from "@/lib/data/shop";
import type { FeedPost } from "@/lib/repo/community";
import { cn, money } from "@/lib/utils";
import { mediaUrl } from "../shop/media";
import { ShareSheet } from "./share-sheet";
import { act, ago, Avatar, downloadMedia, RichText } from "./shared";

type Comment = { id: string; author: string; authorImage?: string; handle?: string | null; text: string; createdAt: number };

const KIND: Record<string, { label: string; icon: typeof Star } | undefined> = {
  tip: { label: "Tip", icon: Lightbulb },
  question: { label: "Question", icon: HelpCircle },
  review: { label: "Review", icon: Star },
};

export function useFeedActions(signedIn: boolean, openLogin: () => void, flash: (m: string) => void) {
  return async (body: Record<string, unknown>) => {
    if (!signedIn) {
      openLogin();
      return null;
    }
    try {
      return await act(body);
    } catch (e) {
      flash((e as Error).message);
      return null;
    }
  };
}

export function FeedVideo({ m, muted, onToggleMute, onView, fit = "contain" }: { m: Media; muted: boolean; onToggleMute: () => void; onView?: () => void; fit?: "contain" | "cover" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio > 0.6) {
          v.play().catch(() => {});
          if (!seen.current) {
            seen.current = true;
            onView?.();
          }
        } else v.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [onView]);
  return (
    <div className="relative h-full w-full bg-black">
      <video ref={ref} src={m.url} poster={m.poster} muted={muted} loop playsInline preload="metadata" className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Swipeable photos/videos with Instagram-style double-tap to like. */
export function MediaStrip({ media, alt, onDoubleTap, onView }: { media: Media[]; alt: string; onDoubleTap: () => void; onView?: () => void }) {
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(0);
  const last = useRef(0);
  const tall = media.some((m) => m.type === "video");
  return (
    <div
      className="relative select-none"
      onClick={() => {
        const now = Date.now();
        if (now - last.current < 300) {
          setBurst((b) => b + 1);
          onDoubleTap();
        }
        last.current = now;
      }}
    >
      <div onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className={cn("scrollbar-none flex snap-x snap-mandatory overflow-x-auto bg-sand-100", tall ? "aspect-[4/5] max-h-[640px]" : "aspect-[4/5] max-h-[560px] sm:aspect-[4/3]")}>
        {media.map((m, k) => (
          <div key={m.url + k} className="h-full w-full shrink-0 snap-center">
            {m.type === "video" ? <FeedVideo m={m} muted={muted} onToggleMute={() => setMuted(!muted)} onView={onView} /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(m.url, 1080)} alt={alt} loading="lazy" draggable={false} className="h-full w-full object-cover" />}
          </div>
        ))}
      </div>
      {burst > 0 && (
        <span key={burst} className="pointer-events-none absolute inset-0 grid place-items-center">
          <Heart className="h-28 w-28 animate-heart fill-white text-white drop-shadow-xl" />
        </span>
      )}
      {media.length > 1 && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
            {i + 1}/{media.length}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {media.map((_, k) => (
              <span key={k} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-4 bg-white" : "w-1.5 bg-white/60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** "Shop this" / "Book this" — the listing tagged in a post. */
export function TaggedListing({ p, dark }: { p: NonNullable<FeedPost["product"]>; dark?: boolean }) {
  const service = p.kind === "service";
  return (
    <Link href={`/marketplace/product/${p.id}`} className={cn("flex items-center gap-3 rounded-2xl p-2 pr-3 transition-colors", dark ? "bg-white/15 text-white backdrop-blur hover:bg-white/25" : "bg-sand-50 hover:bg-sand-100")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.image && <img src={mediaUrl(p.image, 120, 120)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{p.title}</span>
        <span className={cn("block truncate text-xs", dark ? "text-white/75" : "text-ink-muted")}>
          {p.store} · {money(p.price)}
          {service ? ` ${SERVICE_UNITS[p.unit] ?? ""}` : ""}
        </span>
      </span>
      <span className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 font-display text-xs font-semibold", dark ? "bg-white text-ink" : "bg-ink text-white")}>
        {service ? <CalendarCheck className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />} {service ? "Book" : "Shop"}
      </span>
    </Link>
  );
}

export function FollowButton({ userId, initial, small, onChange, run }: { userId: string; initial: boolean; small?: boolean; onChange?: (on: boolean, followers: number) => void; run: (b: Record<string, unknown>) => Promise<{ following: boolean; followers: number } | null> }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setOn(initial);
  }, [initial]);
  return (
    <button
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        setOn(!on);
        const d = await run({ action: "follow", userId });
        setBusy(false);
        if (d) {
          setOn(d.following);
          onChange?.(d.following, d.followers);
        } else setOn(on);
      }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold transition-colors", small ? "h-8 px-3 text-xs" : "h-10 px-5 text-sm", on ? "bg-sand-100 text-ink" : "bg-savanna-500 text-white hover:bg-savanna-600")}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}

export function PostCard({ post, run, flash, onChange, onRemove }: { post: FeedPost; run: (b: Record<string, unknown>) => Promise<any>; flash: (m: string) => void; onChange: (p: Partial<FeedPost>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const place = post.placeId ? PLACE_BY_ID[post.placeId] : undefined;
  const K = KIND[post.kind];
  const profile = post.author.handle ? `/community/u/${post.author.handle}` : "#";

  const like = async (only?: "on") => {
    if (only && post.liked) return;
    onChange({ liked: only ? true : !post.liked, likeCount: post.likeCount + (only || !post.liked ? 1 : -1) });
    const d = await run({ action: "like", id: post.id, only });
    if (d) onChange({ liked: d.liked, likeCount: d.likeCount });
  };
  const loadComments = async () => {
    const d = await fetch(`/api/community/comments?postId=${post.id}`).then((r) => r.json()).catch(() => ({ comments: [] }));
    setComments(d.comments ?? []);
  };
  const long = post.text.length > 220;

  return (
    <motion.article layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[1.75rem] bg-white shadow-card ring-1 ring-ink/[0.04]">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={profile}>
          <Avatar name={post.author.name} image={post.author.image} size={42} ring={post.author.team || !!post.author.seller} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 font-display text-sm font-semibold">
            <Link href={profile} className="hover:underline">
              {post.author.name.replace(" (demo)", "")}
            </Link>
            {post.author.team && <ShieldCheck className="h-4 w-4 text-savanna-600" aria-label="Tembea team" />}
            {post.author.seller && (
              <Link href={`/marketplace/store/${post.author.seller}`} className="inline-flex items-center gap-0.5 rounded-full bg-ochre-50 px-1.5 py-0.5 text-[10px] font-semibold text-ochre-700">
                <Store className="h-3 w-3" /> Seller
              </Link>
            )}
            <span className="font-normal text-ink-muted">· {ago(post.createdAt)}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
            {place && (
              <Link href={`/community/place/${place.id}`} className="inline-flex items-center gap-0.5 hover:text-ink">
                <MapPin className="h-3.5 w-3.5" /> {place.name}
              </Link>
            )}
            {K && (
              <span className="inline-flex items-center gap-0.5">
                <K.icon className="h-3.5 w-3.5" /> {K.label}
              </span>
            )}
          </p>
        </div>
        {!post.mine && !post.following && post.author.handle && <FollowButton userId={post.author.id} initial={post.following} small run={run} onChange={(f) => onChange({ following: f })} />}
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-100" aria-label="More" aria-expanded={menu}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute right-0 z-30 mt-1 w-48 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-ink/5" role="menu" onMouseLeave={() => setMenu(false)}>
              {post.media.length > 0 && (
                <button role="menuitem" onClick={() => (downloadMedia(post.media), setMenu(false), flash("Saving to your device…"))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sand-100">
                  <Share2 className="h-4 w-4" /> Save to device
                </button>
              )}
              {post.mine ? (
                <button
                  role="menuitem"
                  onClick={async () => {
                    setMenu(false);
                    if (!window.confirm("Delete this post?")) return;
                    const d = await run({ action: "delete", id: post.id });
                    if (d?.deleted) onRemove();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-maasai-600 hover:bg-sand-100"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              ) : (
                <button
                  role="menuitem"
                  onClick={async () => {
                    setMenu(false);
                    const r = window.prompt("What's wrong with this post? (spam, offensive, false information…)");
                    if (r && (await run({ action: "report", id: post.id, reason: r }))) flash("Thanks — our team will take a look");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sand-100"
                >
                  <Flag className="h-4 w-4" /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {post.media.length > 0 && <MediaStrip media={post.media} alt={place ? `From ${place.name}` : "Post"} onDoubleTap={() => like("on")} onView={() => fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view", id: post.id }) }).catch(() => {})} />}

      <div className="flex items-center gap-0.5 px-2 pt-1.5 sm:px-3">
        <button onClick={() => like()} aria-pressed={post.liked} aria-label="Like" className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold hover:bg-sand-100", post.liked ? "text-maasai-500" : "text-ink")}>
          <Heart key={String(post.liked)} className={cn("h-[22px] w-[22px]", post.liked && "animate-bump fill-current")} />
          {post.likeCount || ""}
        </button>
        <button
          onClick={() => {
            setOpen(!open);
            if (!comments) loadComments();
          }}
          aria-label="Comments"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold hover:bg-sand-100"
        >
          <MessageCircle className="h-[22px] w-[22px]" /> {post.commentCount || ""}
        </button>
        <button onClick={() => setShare(true)} aria-label="Share" className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold hover:bg-sand-100">
          <Send className="h-[21px] w-[21px] -rotate-12" /> {post.shareCount || ""}
        </button>
        <button
          onClick={async () => {
            onChange({ saved: !post.saved });
            const d = await run({ action: "save", id: post.id });
            if (d) {
              onChange({ saved: d.saved });
              flash(d.saved ? "Saved to your collection" : "Removed from saved");
            }
          }}
          aria-pressed={post.saved}
          aria-label={post.saved ? "Saved" : "Save"}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-sand-100"
        >
          <Bookmark className={cn("h-[22px] w-[22px]", post.saved && "fill-current")} />
        </button>
      </div>

      <div className="px-4 pb-4">
        {post.kind === "review" && post.rating && (
          <p className="mb-1 flex gap-0.5" aria-label={`${post.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={cn("h-4 w-4", n <= post.rating! ? "fill-ochre-400 text-ochre-400" : "text-ink/15")} />
            ))}
          </p>
        )}
        {post.text && (
          <div className="text-[15px] leading-relaxed text-ink-soft">
            <RichText text={long && !more ? post.text.slice(0, 220) + "…" : post.text} />
            {long && (
              <button onClick={() => setMore(!more)} className="text-sm font-semibold text-ink-muted">
                {more ? "less" : "more"}
              </button>
            )}
          </div>
        )}
        {post.product && (
          <div className="mt-3">
            <TaggedListing p={post.product} />
          </div>
        )}
        {post.viewCount > 20 && <p className="mt-2 text-xs text-ink-muted">{post.viewCount.toLocaleString()} views</p>}
        {!open && post.commentCount > 0 && (
          <button
            onClick={() => {
              setOpen(true);
              loadComments();
            }}
            className="mt-1 text-sm text-ink-muted"
          >
            View {post.commentCount === 1 ? "1 comment" : `all ${post.commentCount} comments`}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink/[0.05] bg-sand-50/60">
            <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-3">
              {comments === null && <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />}
              {comments?.length === 0 && <p className="text-sm text-ink-muted">No comments yet. Start the conversation.</p>}
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author} image={c.authorImage} size={30} />
                  <div className="min-w-0 text-sm">
                    <span className="font-display text-xs font-semibold">{c.handle ? <Link href={`/community/u/${c.handle}`}>{c.author}</Link> : c.author}</span> <span className="text-xs text-ink-muted">{ago(c.createdAt)}</span>
                    <RichText text={c.text} className="text-ink-soft" />
                  </div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-ink/[0.05] px-4 py-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                const d = await run({ action: "comment", id: post.id, text: draft.trim() });
                if (d) {
                  onChange({ commentCount: d.commentCount });
                  setDraft("");
                  loadComments();
                }
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" maxLength={500} aria-label="Write a comment" className="h-10 min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500" />
              <button type="submit" disabled={!draft.trim()} className="h-10 rounded-full px-3 font-display text-sm font-semibold text-savanna-600 disabled:opacity-40">
                Post
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareSheet
        post={post}
        open={share}
        onClose={() => setShare(false)}
        flash={flash}
        onShared={() => {
          onChange({ shareCount: post.shareCount + 1 });
          fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share", id: post.id }) }).catch(() => {});
        }}
      />
    </motion.article>
  );
}
