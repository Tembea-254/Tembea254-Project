"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Heart, MessageCircle, Clapperboard, Compass, Hash, Home, Images, Layers, Loader2, MapPin, Plus, Radio, Search, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PLACES } from "@/lib/data/places";
import type { FeedPost } from "@/lib/repo/community";
import { cn, money } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";
import { mediaUrl } from "../shop/media";
import { CommentsSheet } from "./comments-sheet";
import { Composer } from "./composer";
import { FollowButton, PostCard, useFeedActions } from "./post-card";
import { Reels } from "./reels";
import { ago, Avatar } from "./shared";
import { StoriesBar, type StoryGroup } from "./stories";

type Person = { id: string; name: string; image: string | null; handle: string | null; bio: string | null; posts: number };
type Live = { id: string; title: string; host: string; scheduledAt: number; status: string; destination: string };
type Tab = "foryou" | "reels" | "following" | "explore";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "foryou", label: "For you", icon: Sparkles },
  { id: "reels", label: "Reels", icon: Clapperboard },
  { id: "following", label: "Following", icon: Users },
  { id: "explore", label: "Explore", icon: Compass },
];

export function useFlash() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);
  const node = (
    <AnimatePresence>
      {toast && (
        <motion.div role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-28 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lift lg:bottom-8">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-savanna-400" /> {toast}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { flash, toast: node };
}

/** Infinite feed for any filter (all, following, tag:x, place:x, user:x, saved…). */
export function Feed({ filter, run, flash, empty, refreshKey = 0 }: { filter: string; run: (b: Record<string, unknown>) => Promise<any>; flash: (m: string) => void; empty?: React.ReactNode; refreshKey?: number }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      const d = await fetch(`/api/community?filter=${encodeURIComponent(filter)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`)
        .then((r) => r.json())
        .catch(() => ({ posts: [], next: null }));
      setPosts((all) => {
        const merged = [...(cursor ? all ?? [] : []), ...(d.posts ?? [])] as FeedPost[];
        return merged.filter((x, i) => merged.findIndex((y) => y.id === x.id) === i);
      });
      setNext(d.next ?? null);
      setLoading(false);
    },
    [filter],
  );
  useEffect(() => {
    setPosts(null);
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading) load(next);
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loading, load]);

  const patch = (id: string, p: Partial<FeedPost>) => setPosts((all) => all?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? null);

  return (
    <div className="space-y-5">
      {posts === null && [0, 1].map((i) => <div key={i} className="h-[520px] animate-pulse rounded-[1.75rem] bg-white/70" />)}
      {posts?.length === 0 && (empty ?? <p className="rounded-[1.75rem] border border-dashed border-ink/15 p-10 text-center text-ink-muted">Nothing here yet.</p>)}
      {posts?.map((p) => (
        <PostCard key={p.id} post={p} run={run} flash={flash} onChange={(x) => patch(p.id, x)} onRemove={() => setPosts((all) => all?.filter((y) => y.id !== p.id) ?? null)} />
      ))}
      <div ref={sentinel} />
      {loading && posts && (
        <p className="flex justify-center py-4 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </p>
      )}
    </div>
  );
}

/** Instagram-style explore grid. */
export function PostGrid({ filter, columns = 3 }: { filter: string; columns?: 2 | 3 }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const load = useCallback(
    async (cursor?: string | null) => {
      const d = await fetch(`/api/community?filter=${encodeURIComponent(filter)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`)
        .then((r) => r.json())
        .catch(() => ({ posts: [], next: null }));
      setPosts((all) => [...(cursor ? all ?? [] : []), ...((d.posts ?? []) as FeedPost[]).filter((p) => p.media.length)]);
      setNext(d.next ?? null);
    },
    [filter],
  );
  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);
  if (posts === null) return <div className={cn("grid gap-1", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>{Array.from({ length: 9 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/70" />)}</div>;
  if (!posts.length) return <p className="rounded-3xl border border-dashed border-ink/15 p-10 text-center text-ink-muted">No photos or videos yet.</p>;
  return (
    <>
      <div className={cn("grid gap-1 sm:gap-1.5", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {posts.map((p, i) => {
          const m = p.media[0];
          const big = columns === 3 && i % 10 === 2;
          return (
            <Link key={p.id} href={`/community/p/${p.id}`} className={cn("group relative overflow-hidden rounded-lg bg-sand-100", big ? "row-span-2 aspect-[1/2]" : "aspect-square")}>
              {m.type === "video" ? <video src={m.url} poster={m.poster} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(m.url, 500, 500)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              <span className="absolute right-1.5 top-1.5 text-white drop-shadow">{m.type === "video" ? <Clapperboard className="h-4 w-4" /> : p.media.length > 1 ? <Layers className="h-4 w-4" /> : null}</span>
              <span className="absolute inset-0 flex items-center justify-center gap-3 bg-black/35 font-display text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><Heart className="h-4 w-4 fill-white" /> {p.likeCount}<MessageCircle className="ml-2 h-4 w-4 fill-white" /> {p.commentCount}</span>
            </Link>
          );
        })}
      </div>
      {next && (
        <button onClick={() => load(next)} className="mx-auto mt-4 flex h-11 items-center rounded-full bg-white px-6 font-display text-sm font-semibold shadow-card">
          Load more
        </button>
      )}
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState<{ people: Person[]; tags: { tag: string; n: number }[]; places: { id: string; name: string; region: string; image: string }[]; listings: { id: string; title: string; price: number; image: string | null; storeName: string }[] } | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) return setR(null);
    const t = setTimeout(() => {
      fetch(`/api/community/search?q=${encodeURIComponent(q)}`)
        .then((x) => x.json())
        .then(setR)
        .catch(() => {});
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="mx-auto mt-0 max-h-[100dvh] max-w-xl overflow-y-auto bg-white p-4 shadow-lift sm:mt-16 sm:rounded-3xl">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, #tags, places, things to book or buy" aria-label="Search the community" className="h-12 w-full rounded-2xl bg-sand-50 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-savanna-500" />
          </div>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-100" aria-label="Close search">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!r && (
          <div className="mt-4">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">Places</p>
            <div className="flex flex-wrap gap-2">
              {PLACES.map((p) => (
                <Link key={p.id} href={`/community/place/${p.id}`} onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-sm hover:bg-sand-200">
                  <MapPin className="h-3.5 w-3.5" /> {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {r && (
          <div className="mt-4 space-y-5">
            {r.people.length > 0 && (
              <section>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">People</p>
                {r.people.map((p) => (
                  <Link key={p.id} href={`/community/u/${p.handle}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
                    <Avatar name={p.name} image={p.image} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-ink-muted">@{p.handle}</span>
                    </span>
                  </Link>
                ))}
              </section>
            )}
            {r.tags.length > 0 && (
              <section>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {r.tags.map((t) => (
                    <Link key={t.tag} href={`/community?tag=${t.tag}`} onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-savanna-50 px-3 py-1.5 text-sm text-savanna-700">
                      #{t.tag} <span className="text-xs text-ink-muted">{t.n}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {r.places.length > 0 && (
              <section>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">Places</p>
                {r.places.map((p) => (
                  <Link key={p.id} href={`/community/place/${p.id}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.image, 100, 100)} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    <span>
                      <span className="block font-display text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-ink-muted">{p.region}</span>
                    </span>
                  </Link>
                ))}
              </section>
            )}
            {r.listings.length > 0 && (
              <section>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">In the marketplace</p>
                {r.listings.map((p) => (
                  <Link key={p.id} href={`/marketplace/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image && <img src={mediaUrl(p.image, 100, 100)} alt="" className="h-10 w-10 rounded-xl object-cover" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.title}</span>
                      <span className="text-xs text-ink-muted">{p.storeName.replace(" (demo)", "")}</span>
                    </span>
                    <span className="font-display text-sm font-semibold">{money(p.price)}</span>
                  </Link>
                ))}
              </section>
            )}
            {!r.people.length && !r.tags.length && !r.places.length && !r.listings.length && <p className="p-6 text-center text-sm text-ink-muted">Nothing found for “{q}”.</p>}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

type Note = { id: string; type: string; text: string; href: string | null; read: boolean; actorName: string | null; actorImage: string | null; createdAt: number };

function Notifications() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Note[] | null>(null);
  useEffect(() => {
    const tick = () => fetch("/api/notifications?count=1").then((r) => r.json()).then((d) => setUnread(d.unread ?? 0)).catch(() => {});
    tick();
    const t = setInterval(tick, 45_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative">
      <button
        onClick={async () => {
          setOpen(!open);
          if (!open) {
            const d = await fetch("/api/notifications").then((r) => r.json()).catch(() => ({ items: [] }));
            setItems(d.items ?? []);
            if (unread) fetch("/api/notifications", { method: "POST" }).then(() => setUnread(0));
          }
        }}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white shadow-card"
        aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-maasai-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-40 mt-2 max-h-[70dvh] w-[min(92vw,360px)] overflow-y-auto rounded-3xl bg-white p-2 shadow-lift ring-1 ring-ink/5">
            <p className="px-3 py-2 font-display font-semibold">Activity</p>
            {items === null && <Loader2 className="m-3 h-4 w-4 animate-spin" />}
            {items?.length === 0 && <p className="px-3 pb-3 text-sm text-ink-muted">Likes, comments, follows and order updates show up here.</p>}
            {items?.map((n) => (
              <Link key={n.id} href={n.href || "#"} onClick={() => setOpen(false)} className={cn("flex items-start gap-3 rounded-2xl p-2.5 hover:bg-sand-50", !n.read && "bg-savanna-50/60")}>
                <Avatar name={n.actorName || "Tembea"} image={n.actorImage} size={36} />
                <span className="min-w-0 flex-1 text-sm">
                  {n.text}
                  <span className="block text-xs text-ink-muted">{ago(n.createdAt)}</span>
                </span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RightRail({ trending, people, live, run }: { trending: { tag: string; n: number }[]; people: Person[]; live: Live[]; run: (b: Record<string, unknown>) => Promise<any> }) {
  return (
    <aside className="hidden space-y-4 xl:block">
      {live.length > 0 && (
        <section className="rounded-3xl bg-ink p-4 text-white">
          <p className="mb-2 flex items-center gap-2 font-display text-sm font-semibold">
            <Radio className="h-4 w-4 text-maasai-400" /> Live virtual walks
          </p>
          {live.slice(0, 3).map((l) => (
            <Link key={l.id} href="/vr#live" className="block rounded-2xl p-2 hover:bg-white/10">
              <span className="block truncate text-sm font-medium">{l.title}</span>
              <span className="text-xs text-white/60">
                {l.status === "live" ? "Live now" : new Date(l.scheduledAt).toLocaleString("en-KE", { weekday: "short", hour: "2-digit", minute: "2-digit" })} · {l.host}
              </span>
            </Link>
          ))}
        </section>
      )}
      {trending.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-card">
          <p className="mb-2 flex items-center gap-2 font-display text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-savanna-600" /> Trending in Kenya
          </p>
          <ul>
            {trending.slice(0, 8).map((t, i) => (
              <li key={t.tag}>
                <Link href={`/community?tag=${t.tag}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-sand-50">
                  <span>
                    <span className="mr-2 text-xs text-ink-muted">{i + 1}</span>#{t.tag}
                  </span>
                  <span className="text-xs text-ink-muted">{t.n} posts</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {people.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-card">
          <p className="mb-2 font-display text-sm font-semibold">Guides, makers and creators to follow</p>
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-1.5">
              <Link href={`/community/u/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={p.name} image={p.image} size={38} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{p.bio || `@${p.handle}`}</span>
                </span>
              </Link>
              <FollowButton userId={p.id} initial={false} small run={run} />
            </div>
          ))}
        </section>
      )}
      <p className="px-2 text-xs text-ink-muted">Post honestly, credit people in your photos, and be kind. Reviews that help others earn reward tokens.</p>
    </aside>
  );
}

export function CommunityHub({
  me,
  stories,
  live,
  trending,
  people,
  initialTab,
  tag,
}: {
  me: { name: string; image: string | null; handle: string | null } | null;
  stories: StoryGroup[];
  live: Live[];
  trending: { tag: string; n: number }[];
  people: Person[];
  initialTab: Tab;
  tag?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { openLogin } = useLoginGate();
  const signedIn = !!session?.user || !!me;
  const { flash, toast } = useFlash();
  const run = useFeedActions(signedIn, () => openLogin({ callbackUrl: "/community", reason: "Sign in to post, like, follow and save." }), flash);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [compose, setCompose] = useState<"post" | "story" | null>(null);
  const [search, setSearch] = useState(false);
  const [comments, setComments] = useState<FeedPost | null>(null);
  const [refresh, setRefresh] = useState(0);

  const go = (t: Tab) => {
    setTab(t);
    router.replace(t === "foryou" ? "/community" : `/community?tab=${t}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,620px)_300px] xl:justify-center">
        <div className="min-w-0">
          <header className="mb-4 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-savanna-600">Kenya, as travellers live it</p>
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{tag ? `#${tag}` : "Community"}</h1>
            </div>
            <button onClick={() => setSearch(true)} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-card" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
            {signedIn && <Notifications />}
            {me && (
              <Link href="/community/u/me" aria-label="Your profile" className="shrink-0">
                <Avatar name={me.name} image={me.image} size={44} />
              </Link>
            )}
            <button onClick={() => (signedIn ? setCompose("post") : openLogin({ callbackUrl: "/community" }))} className="hidden h-11 items-center gap-2 rounded-full bg-savanna-500 px-5 font-display text-sm font-semibold text-white shadow-card hover:bg-savanna-600 sm:inline-flex">
              <Plus className="h-4 w-4" /> Create
            </button>
          </header>

          {tag ? (
            <div className="mb-4 flex items-center gap-2">
              <Link href="/community" className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold shadow-card">
                <X className="h-4 w-4" /> Clear
              </Link>
              <span className="inline-flex h-9 items-center gap-1 rounded-full bg-savanna-50 px-3 text-sm font-semibold text-savanna-700">
                <Hash className="h-4 w-4" /> {tag}
              </span>
            </div>
          ) : (
            <nav className="scrollbar-none sticky top-[60px] z-20 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-sand-50/90 px-4 py-2 backdrop-blur lg:top-0" aria-label="Community sections">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => go(t.id)} aria-pressed={tab === t.id} className={cn("relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 font-display text-sm font-semibold transition-colors", tab === t.id ? "text-white" : "bg-white text-ink-soft shadow-card hover:text-ink")}>
                  {tab === t.id && <motion.span layoutId="community-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  <span className="relative inline-flex items-center gap-1.5">
                    <t.icon className="h-4 w-4" /> {t.label}
                  </span>
                </button>
              ))}
            </nav>
          )}

          {tag ? (
            <Feed filter={`tag:${tag}`} run={run} flash={flash} refreshKey={refresh} />
          ) : (
            <>
              {(tab === "foryou" || tab === "following") && (
                <div className="mb-5 rounded-[1.75rem] bg-white p-3 shadow-card">
                  <StoriesBar groups={stories} me={me} live={live} onCreate={() => (signedIn ? setCompose("story") : openLogin({ callbackUrl: "/community" }))} />
                </div>
              )}
              {tab === "foryou" && (
                <>
                  <button onClick={() => (signedIn ? setCompose("post") : openLogin({ callbackUrl: "/community" }))} className="mb-5 flex w-full items-center gap-3 rounded-[1.75rem] bg-white p-3 text-left shadow-card">
                    <Avatar name={me?.name ?? "You"} image={me?.image} size={42} />
                    <span className="flex-1 rounded-full bg-sand-50 px-4 py-3 text-sm text-ink-muted">Share a moment, a tip or a review…</span>
                    <Images className="h-6 w-6 text-savanna-600" />
                  </button>
                  <Feed filter="all" run={run} flash={flash} refreshKey={refresh} />
                </>
              )}
              {tab === "following" && (
                <Feed
                  filter="following"
                  run={run}
                  flash={flash}
                  refreshKey={refresh}
                  empty={
                    <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-card">
                      <p className="font-display text-lg font-semibold">Follow guides, makers and travellers</p>
                      <p className="mt-1 text-sm text-ink-muted">Their posts and stories will show up here.</p>
                      <div className="mt-4 space-y-2 text-left">
                        {people.map((p) => (
                          <div key={p.id} className="flex items-center gap-3">
                            <Link href={`/community/u/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                              <Avatar name={p.name} image={p.image} size={40} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{p.name}</span>
                                <span className="block truncate text-xs text-ink-muted">{p.bio}</span>
                              </span>
                            </Link>
                            <FollowButton userId={p.id} initial={false} small run={run} onChange={() => setRefresh((r) => r + 1)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                />
              )}
              {tab === "reels" && <Reels run={run} flash={flash} onOpenComments={setComments} />}
              {tab === "explore" && (
                <div className="space-y-5">
                  <button onClick={() => setSearch(true)} className="flex h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-sm text-ink-muted shadow-card">
                    <Search className="h-4 w-4" /> Search people, #tags, places, tours and crafts
                  </button>
                  {trending.length > 0 && (
                    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
                      {trending.map((t) => (
                        <Link key={t.tag} href={`/community?tag=${t.tag}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-sm font-medium shadow-card">
                          #{t.tag}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                    {PLACES.map((p) => (
                      <Link key={p.id} href={`/community/place/${p.id}`} className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(p.image, 240, 300)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute inset-x-2 bottom-2 font-display text-xs font-semibold leading-tight text-white">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                  <PostGrid filter="all" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="xl:sticky xl:top-6 xl:h-fit">
          <RightRail trending={trending} people={people} live={live} run={run} />
        </div>
      </div>

      {/* phone: floating create button */}
      {(tab !== "reels" || !!tag) && (
      <button onClick={() => (signedIn ? setCompose("post") : openLogin({ callbackUrl: "/community" }))} className="fixed bottom-[104px] left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-savanna-500 text-white shadow-lift active:scale-95 sm:hidden" aria-label="Create a post">
        <Plus className="h-6 w-6" />
      </button>
      )}

      <AnimatePresence>{search && <SearchPanel onClose={() => setSearch(false)} />}</AnimatePresence>
      {me && (
        <Composer
          open={compose !== null}
          mode={compose ?? "post"}
          onClose={() => setCompose(null)}
          me={me}
          onDone={(m) => {
            flash(m);
            setRefresh((r) => r + 1);
            router.refresh();
          }}
        />
      )}
      <CommentsSheet post={comments} onClose={() => setComments(null)} run={run} />
      {toast}
    </div>
  );
}

