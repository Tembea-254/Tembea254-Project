"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, HelpCircle, ImagePlus, Lightbulb, Link2, Loader2, MapPin, MessageCircle, Megaphone, Heart, Send, Share2, ShieldCheck, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PostView } from "@/lib/data/community";
import { PLACES, PLACE_BY_ID } from "@/lib/data/places";
import { cn, unsplash } from "@/lib/utils";
import { InstagramIcon, TikTokIcon, WhatsAppIcon, XIcon, FacebookGlyph } from "../brand/social-icons";
import { Button } from "../ui/button";
import { Chip, Select, Textarea } from "../ui/primitives";

type Kind = PostView["kind"];
const KINDS: { value: Kind; label: string; icon: typeof Megaphone }[] = [
  { value: "update", label: "Journey update", icon: Megaphone },
  { value: "tip", label: "Travel tip", icon: Lightbulb },
  { value: "question", label: "Question", icon: HelpCircle },
];

const imgSrc = (s: string, w = 1000, h = 640) => (s.startsWith("data:") ? s : unsplash(s, w, h));

function ago(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(ts).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

/** Shrinks a photo in the browser so posts stay light (max ~1280px, JPEG). */
async function compress(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  let w = bmp.width;
  let h = bmp.height;
  const max = 1280;
  if (Math.max(w, h) > max) {
    const k = max / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  let q = 0.8;
  let out = c.toDataURL("image/jpeg", q);
  while (out.length > 440_000 && q > 0.35) {
    q -= 0.1;
    out = c.toDataURL("image/jpeg", q);
  }
  if (out.length > 440_000) {
    c.width = Math.round(w * 0.6);
    c.height = Math.round(h * 0.6);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", 0.6);
  }
  return out;
}

function Avatar({ name, image, team }: { name: string; image?: string; team?: boolean }) {
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white", team ? "bg-savanna-500" : "bg-ink")}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function CommunityFeed() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostView[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    fetch("/api/community")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  const act = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) {
      flash(d.error || "Something went wrong");
      return null;
    }
    return d;
  };

  const update = (p: PostView) => setPosts((all) => all?.map((x) => (x.id === p.id ? p : x)) ?? null);

  const places = Array.from(new Set((posts ?? []).map((p) => p.placeId).filter(Boolean))) as string[];
  const shown = (posts ?? []).filter((p) => filter === "all" || p.placeId === filter || (filter === "questions" && p.kind === "question"));

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-savanna-600">Community</p>
        <h1 className="mt-1 text-3xl font-bold">Stories from the road</h1>
        <p className="mt-1 text-ink-muted">Share journey updates, swap tips and cross-post to TikTok, Instagram or X.</p>
      </header>

      <Composer
        name={session?.user?.name || "Traveller"}
        image={session?.user?.image || undefined}
        onPost={async (body) => {
          const d = await act({ action: "post", ...body });
          if (d?.post) {
            setPosts((all) => [d.post, ...(all ?? [])]);
            flash("Posted to the community");
            return true;
          }
          return false;
        }}
      />

      <div className="scrollbar-none -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} className="shrink-0 whitespace-nowrap">
          All posts
        </Chip>
        <Chip active={filter === "questions"} onClick={() => setFilter("questions")} className="shrink-0 whitespace-nowrap">
          <HelpCircle className="h-4 w-4" /> Questions
        </Chip>
        {places.map((id) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)} className="shrink-0 whitespace-nowrap">
            <MapPin className="h-4 w-4" /> {PLACE_BY_ID[id]?.name ?? id}
          </Chip>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {posts === null &&
          [0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-white/70" />)}
        {posts && !shown.length && <p className="rounded-3xl border border-dashed border-ink/15 p-8 text-center text-ink-muted">Nothing here yet. Be the first to post.</p>}
        <AnimatePresence initial={false}>
          {shown.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              mine={!!session?.user?.email && p.authorEmail === session.user.email}
              onLike={async () => {
                update({ ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) });
                const d = await act({ action: "like", id: p.id });
                if (d?.post) update(d.post);
              }}
              onComment={async (text) => {
                const d = await act({ action: "comment", id: p.id, text });
                if (d?.post) update(d.post);
                return !!d;
              }}
              onDelete={async () => {
                const d = await act({ action: "delete", id: p.id });
                if (d?.deleted) {
                  setPosts((all) => all?.filter((x) => x.id !== p.id) ?? null);
                  flash("Post deleted");
                }
              }}
              flash={flash}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lift lg:bottom-8"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-savanna-400" /> {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Composer({ name, image, onPost }: { name: string; image?: string; onPost: (b: { text: string; image?: string; placeId?: string; kind: Kind }) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [placeId, setPlaceId] = useState("");
  const [kind, setKind] = useState<Kind>("update");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
      <div className="flex gap-3">
        <Avatar name={name} image={image} />
        <div className="min-w-0 flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === "question" ? "Ask fellow travellers…" : kind === "tip" ? "Share a tip others should know…" : "Where are you and what did you see today?"}
            rows={3}
            maxLength={1200}
            aria-label="Write a post"
            className="resize-none border-0 bg-sand-50 focus-visible:ring-1"
          />
          {photo && (
            <div className="relative mt-3 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Selected photo" className="max-h-72 w-full object-cover" />
              <button onClick={() => setPhoto(undefined)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove photo">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-3">
        <div className="flex gap-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              title={k.label}
              aria-pressed={kind === k.value}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors", kind === k.value ? "bg-ink text-white" : "text-ink-soft hover:bg-sand-100")}
            >
              <k.icon className="h-4 w-4" /> <span className="hidden sm:inline">{k.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => file.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-soft hover:bg-sand-100">
          <ImagePlus className="h-4 w-4" /> Photo
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(await compress(f));
            e.target.value = "";
          }}
        />
        <Select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="h-9 w-auto rounded-full text-xs" aria-label="Tag a place">
          <option value="">Tag a place</option>
          {PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          className="ml-auto"
          disabled={busy || (!text.trim() && !photo)}
          onClick={async () => {
            setBusy(true);
            const ok = await onPost({ text, image: photo, placeId: placeId || undefined, kind });
            setBusy(false);
            if (ok) {
              setText("");
              setPhoto(undefined);
              setPlaceId("");
              setKind("update");
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post
        </Button>
      </div>
    </div>
  );
}

function PostCard({
  post,
  mine,
  onLike,
  onComment,
  onDelete,
  flash,
}: {
  post: PostView;
  mine: boolean;
  onLike: () => void;
  onComment: (t: string) => Promise<boolean>;
  onDelete: () => void;
  flash: (m: string) => void;
}) {
  const [open, setOpen] = useState(post.comments.length > 0 && post.comments.length <= 2);
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const place = post.placeId ? PLACE_BY_ID[post.placeId] : undefined;
  const K = KINDS.find((k) => k.value === post.kind)!;

  return (
    <motion.article layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <Avatar name={post.author} image={post.authorImage} team={post.team} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-display text-sm font-semibold">
            {post.author}
            {post.team && (
              <span className="inline-flex items-center gap-1 rounded-full bg-savanna-50 px-2 py-0.5 text-[10px] text-savanna-700">
                <ShieldCheck className="h-3 w-3" /> Team
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <K.icon className="h-3.5 w-3.5" /> {K.label}
            </span>
            {place && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {place.name}
              </span>
            )}
            <span>{ago(post.createdAt)}</span>
          </p>
        </div>
        {mine && (
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-100 hover:text-maasai-500" aria-label="Delete post">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {post.text && <p className="whitespace-pre-line px-4 pb-4 text-[15px] leading-relaxed text-ink-soft sm:px-5">{post.text}</p>}
      {post.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc(post.image)} alt={place ? `Photo from ${place.name}` : "Post photo"} loading="lazy" className="max-h-[480px] w-full object-cover" />
      )}

      <div className="flex items-center gap-1 border-t border-ink/5 px-2 py-1.5 sm:px-3">
        <button onClick={onLike} aria-pressed={post.liked} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-sand-100", post.liked ? "text-maasai-500" : "text-ink-soft")}>
          <motion.span key={String(post.liked)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
            <Heart className={cn("h-5 w-5", post.liked && "fill-current")} />
          </motion.span>
          {post.likeCount || ""}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sand-100">
          <MessageCircle className="h-5 w-5" /> {post.comments.length || ""}
        </button>
        <div className="relative ml-auto">
          <button onClick={() => setShare((s) => !s)} aria-expanded={share} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sand-100">
            <Share2 className="h-5 w-5" /> Share
          </button>
          <AnimatePresence>{share && <ShareMenu post={post} onClose={() => setShare(false)} flash={flash} />}</AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-sand-50/60">
            <div className="space-y-3 px-4 py-3 sm:px-5">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author} image={c.authorImage} />
                  <div className="rounded-2xl bg-white px-3 py-2 text-sm shadow-sm">
                    <p className="font-display text-xs font-semibold">
                      {c.author} <span className="font-normal text-ink-muted">· {ago(c.createdAt)}</span>
                    </p>
                    <p className="text-ink-soft">{c.text}</p>
                  </div>
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  if (await onComment(draft.trim())) setDraft("");
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={500}
                  aria-label="Write a comment"
                  className="h-10 min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500"
                />
                <Button size="sm" type="submit" disabled={!draft.trim()} aria-label="Send comment">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function ShareMenu({ post, onClose, flash }: { post: PostView; onClose: () => void; flash: (m: string) => void }) {
  const place = post.placeId ? PLACE_BY_ID[post.placeId] : undefined;
  const url = typeof window !== "undefined" ? `${window.location.origin}/community` : "/community";
  const caption = `${post.text.slice(0, 220)}${post.text.length > 220 ? "…" : ""}${place ? `\n\n${place.name}, Kenya` : ""}\n#Tembea254 #VisitKenya${place ? ` #${place.name.replace(/[^A-Za-z]/g, "")}` : ""}`;

  const imageFile = async () => {
    if (!post.image) return null;
    const blob = await fetch(imgSrc(post.image, 1080, 1080)).then((r) => r.blob());
    return new File([blob], "tembea254.jpg", { type: blob.type || "image/jpeg" });
  };

  /** TikTok and Instagram have no web share links: use the phone's share sheet with the photo, else download + copy the caption. */
  const toApp = async (app: string) => {
    try {
      const f = await imageFile().catch(() => null);
      if (f && navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: caption });
        onClose();
        return;
      }
      await navigator.clipboard?.writeText(caption).catch(() => {});
      if (f) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f);
        a.download = "tembea254.jpg";
        a.click();
        URL.revokeObjectURL(a.href);
      }
      flash(`${f ? "Photo saved and caption" : "Caption"} copied — paste it into ${app}`);
    } catch {
      /* share sheet dismissed */
    }
    onClose();
  };

  const items = [
    { label: "WhatsApp", icon: WhatsAppIcon, cls: "text-[#25D366]", href: `https://wa.me/?text=${encodeURIComponent(`${caption}\n${url}`)}` },
    { label: "X", icon: XIcon, cls: "text-ink", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(url)}` },
    { label: "Facebook", icon: FacebookGlyph, cls: "text-[#1877F2]", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "Instagram", icon: InstagramIcon, cls: "text-[#E1306C]", run: () => toApp("Instagram") },
    { label: "TikTok", icon: TikTokIcon, cls: "text-ink", run: () => toApp("TikTok") },
    {
      label: "Copy text",
      icon: Link2,
      cls: "text-ink-soft",
      run: async () => {
        await navigator.clipboard?.writeText(`${caption}\n${url}`).catch(() => {});
        flash("Copied to clipboard");
        onClose();
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className="absolute bottom-12 right-0 z-30 w-52 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-ink/5"
      role="menu"
    >
      {items.map((it) =>
        it.href ? (
          <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={onClose} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-sand-100">
            <it.icon className={cn("h-5 w-5", it.cls)} /> {it.label}
          </a>
        ) : (
          <button key={it.label} onClick={it.run} role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-sand-100">
            <it.icon className={cn("h-5 w-5", it.cls)} /> {it.label}
          </button>
        ),
      )}
    </motion.div>
  );
}
