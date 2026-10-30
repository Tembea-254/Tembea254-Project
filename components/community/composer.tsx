"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleDashed, HelpCircle, ImagePlus, Lightbulb, Loader2, MapPin, Megaphone, Search, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PLACES } from "@/lib/data/places";
import { prepareImage, uploadFile } from "@/lib/upload-client";
import { cn, money } from "@/lib/utils";
import { mediaUrl } from "../shop/media";
import { Avatar } from "./shared";

type Kind = "update" | "tip" | "question" | "review";
type Pending = { key: string; type: "image" | "video"; preview: string; url?: string; pct: number; error?: string };
type Listing = { id: string; title: string; price: number; image: string | null; storeName: string; kind: string };

const KINDS: { value: Kind; label: string; icon: typeof Megaphone }[] = [
  { value: "update", label: "Moment", icon: Megaphone },
  { value: "tip", label: "Tip", icon: Lightbulb },
  { value: "question", label: "Question", icon: HelpCircle },
  { value: "review", label: "Review", icon: Star },
];

/** Create a post or a 24-hour story: photos/videos, a place, a tagged listing, hashtags. */
export function Composer({ open, mode: initialMode, onClose, me, onDone }: { open: boolean; mode: "post" | "story"; onClose: () => void; me: { name: string; image?: string | null }; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState(initialMode);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<Pending[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [kind, setKind] = useState<Kind>("update");
  const [rating, setRating] = useState(5);
  const [listing, setListing] = useState<Listing | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const uploading = media.some((m) => !m.url && !m.error);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, open]);
  useEffect(() => {
    if (!findOpen || q.trim().length < 2) return setFound([]);
    const t = setTimeout(() => {
      fetch(`/api/community/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setFound(d.listings ?? []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, findOpen]);

  const reset = () => {
    setText("");
    setMedia([]);
    setPlaceId("");
    setKind("update");
    setListing(null);
    setErr("");
  };

  const addFiles = async (files: File[]) => {
    const max = mode === "story" ? 1 : 10;
    for (const f of files.slice(0, max - media.length)) {
      const type = f.type.startsWith("video/") ? "video" : "image";
      if (type === "video" && f.size > 500 * 1024 * 1024) continue;
      const key = Math.random().toString(36).slice(2);
      setMedia((m) => [...(mode === "story" ? [] : m), { key, type, preview: URL.createObjectURL(f), pct: 0 }]);
      try {
        const url = await uploadFile(await prepareImage(f), (pct) => setMedia((m) => m.map((x) => (x.key === key ? { ...x, pct } : x))));
        setMedia((m) => m.map((x) => (x.key === key ? { ...x, url, pct: 100 } : x)));
      } catch (e) {
        setMedia((m) => m.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
      }
    }
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    const ready = media.filter((m) => m.url).map((m) => ({ type: m.type, url: m.url! }));
    const body =
      mode === "story"
        ? { action: "story", media: ready[0], caption: text, placeId, productId: listing?.id }
        : { action: "post", text, media: ready, placeId: placeId || undefined, kind, rating: kind === "review" ? rating : undefined, productId: listing?.id };
    try {
      const r = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't share that.");
      onDone(mode === "story" ? "Your story is live for 24 hours" : kind === "review" ? "Posted — your review earns tokens once approved" : "Posted to the community");
      reset();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canPost = mode === "story" ? media.some((m) => m.url) : !!text.trim() || media.some((m) => m.url);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal aria-label="Create">
          <motion.div initial={{ y: 80, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] bg-white sm:rounded-[1.75rem]">
            <header className="flex items-center gap-2 border-b border-ink/[0.06] px-4 py-3">
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto flex rounded-full bg-sand-100 p-1">
                {(["post", "story"] as const).map((m) => (
                  <button key={m} onClick={() => (setMode(m), m === "story" && setMedia((x) => x.slice(0, 1)))} className={cn("h-8 rounded-full px-4 font-display text-sm font-semibold capitalize", mode === m ? "bg-white shadow-card" : "text-ink-muted")}>
                    {m === "story" ? "Story" : "Post"}
                  </button>
                ))}
              </div>
              <button disabled={busy || uploading || !canPost} onClick={submit} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-savanna-500 px-4 font-display text-sm font-semibold text-white disabled:opacity-40">
                {(busy || uploading) && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "story" ? "Share" : "Post"}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex gap-3">
                <Avatar name={me.name} image={me.image} size={40} />
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={mode === "story" ? 2 : 4}
                  maxLength={mode === "story" ? 200 : 2200}
                  placeholder={mode === "story" ? "Add a caption…" : kind === "question" ? "Ask fellow travellers… (use #hashtags)" : kind === "review" ? "How was it? What should others know?" : "Where are you and what did you see today? #DianiBeach"}
                  className="min-h-[80px] flex-1 resize-none bg-transparent text-[16px] outline-none placeholder:text-ink-muted"
                  aria-label="Caption"
                />
              </div>

              {kind === "review" && mode === "post" && (
                <div className="mt-2 flex items-center gap-1 pl-[52px]" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}>
                      <Star className={cn("h-7 w-7 transition-transform hover:scale-110", n <= rating ? "fill-ochre-400 text-ochre-400" : "text-ink/20")} />
                    </button>
                  ))}
                </div>
              )}

              {media.length > 0 ? (
                <div className={cn("mt-3 grid gap-2", mode === "story" ? "grid-cols-1" : "grid-cols-3")}>
                  {media.map((m) => (
                    <div key={m.key} className={cn("relative overflow-hidden rounded-2xl bg-ink", mode === "story" ? "mx-auto aspect-[9/16] w-48" : "aspect-square")}>
                      {m.type === "video" ? <video src={m.preview} muted className="h-full w-full object-cover" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.preview} alt="" className="h-full w-full object-cover" />}
                      {!m.url && !m.error && (
                        <span className="absolute inset-0 grid place-items-center bg-black/50">
                          <span className="font-display text-sm font-semibold text-white">{m.pct}%</span>
                        </span>
                      )}
                      {m.error && <span className="absolute inset-0 grid place-items-center bg-maasai-600/85 p-2 text-center text-[11px] text-white">{m.error}</span>}
                      <button onClick={() => setMedia((all) => all.filter((x) => x.key !== m.key))} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {mode === "post" && media.length < 10 && (
                    <button onClick={() => file.current?.click()} className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-ink/15 text-ink-muted hover:border-savanna-500">
                      <ImagePlus className="h-6 w-6" />
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={() => file.current?.click()} className="mt-3 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 py-8 text-ink-muted transition-colors hover:border-savanna-500 hover:text-savanna-700">
                  {mode === "story" ? <CircleDashed className="h-8 w-8" /> : <ImagePlus className="h-8 w-8" />}
                  <span className="font-display text-sm font-semibold">{mode === "story" ? "Add a photo or a short video" : "Add photos or videos"}</span>
                  <span className="text-xs">Vertical videos look best · up to 500 MB</span>
                </button>
              )}
              <input
                ref={file}
                type="file"
                accept="image/*,video/*"
                multiple={mode === "post"}
                hidden
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  e.target.value = "";
                  addFiles(fs);
                }}
              />

              {listing && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sand-50 p-2 pr-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {listing.image && <img src={mediaUrl(listing.image, 100, 100)} alt="" className="h-10 w-10 rounded-xl object-cover" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{listing.title}</span>
                  <button onClick={() => setListing(null)} aria-label="Remove tagged listing" className="grid h-7 w-7 place-items-center rounded-full hover:bg-sand-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {findOpen && (
                <div className="mt-3 rounded-2xl border border-ink/10 p-2">
                  <label className="relative block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a product, driver, guide, photographer…" className="h-10 w-full rounded-xl bg-sand-50 pl-9 pr-3 text-sm outline-none" />
                  </label>
                  <ul className="mt-1 max-h-52 overflow-y-auto">
                    {found.map((l) => (
                      <li key={l.id}>
                        <button onClick={() => (setListing(l), setFindOpen(false), setQ(""))} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sand-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {l.image && <img src={mediaUrl(l.image, 80, 80)} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{l.title}</span>
                            <span className="text-xs text-ink-muted">
                              {l.storeName.replace(" (demo)", "")} · {money(l.price)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {err && <p className="mt-3 rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">{err}</p>}
            </div>

            <footer className="space-y-2 border-t border-ink/[0.06] p-3">
              {mode === "post" && (
                <div className="scrollbar-none flex gap-1 overflow-x-auto">
                  {KINDS.map((k) => (
                    <button key={k.value} onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors", kind === k.value ? "bg-ink text-white" : "bg-sand-50 text-ink-soft hover:bg-sand-100")}>
                      <k.icon className="h-4 w-4" /> {k.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="h-9 rounded-full border border-ink/10 bg-white pl-8 pr-3 text-xs" aria-label="Tag a place">
                    <option value="">Add a place</option>
                    {PLACES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => setFindOpen(!findOpen)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", findOpen || listing ? "border-ink bg-ink text-white" : "border-ink/10")}>
                  <ShoppingBag className="h-4 w-4" /> Tag a product or pro
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
