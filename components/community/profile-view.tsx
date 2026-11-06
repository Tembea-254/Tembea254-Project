"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarCheck, Grid3x3, Loader2, Rows3, Share2, ShieldCheck, Star, Store, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";
import { Feed, PostGrid, useFlash } from "./hub";
import { FollowButton, useFeedActions } from "./post-card";
import { act, Avatar } from "./shared";

type Props = {
  user: { id: string; name: string; handle: string; bio: string; image: string | null; team: boolean; joined: number };
  counts: { posts: number; followers: number; following: number; likes: number };
  store: { slug: string; storeName: string; sellerType: string; location: string; ratingAvg: number } | null;
  mine: boolean;
  following: boolean;
};

export function ProfileView({ user, counts, store, mine, following }: Props) {
  const { data } = useSession();
  const { openLogin } = useLoginGate();
  const { flash, toast } = useFlash();
  const router = useRouter();
  const run = useFeedActions(!!data?.user, () => openLogin({ callbackUrl: `/community/u/${user.handle}` }), flash);
  const [tab, setTab] = useState<"grid" | "feed" | "saved">("grid");
  const [followers, setFollowers] = useState(counts.followers);
  const [edit, setEdit] = useState(false);

  const stat = (n: number, l: string) => (
    <div className="text-center sm:text-left">
      <p className="font-display text-lg font-bold leading-none">{n.toLocaleString()}</p>
      <p className="text-xs text-ink-muted">{l}</p>
    </div>
  );

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
        <div className="flex items-center gap-5 sm:block">
          <Avatar name={user.name} image={user.image} size={96} ring={!!store || user.team} />
          <div className="flex flex-1 justify-around sm:hidden">
            {stat(counts.posts, "posts")}
            {stat(followers, "followers")}
            {stat(counts.following, "following")}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{user.name.replace(" (demo)", "")}</h1>
            {user.team && <ShieldCheck className="h-5 w-5 text-savanna-600" aria-label="Tembea team" />}
          </div>
          <p className="text-sm text-ink-muted">@{user.handle}</p>
          <div className="mt-3 hidden gap-8 sm:flex">
            {stat(counts.posts, "posts")}
            {stat(followers, "followers")}
            {stat(counts.following, "following")}
            {stat(counts.likes, "likes")}
          </div>
          {user.bio && <p className="mt-3 max-w-lg whitespace-pre-line text-[15px]">{user.bio}</p>}
          {store && (
            <Link href={`/marketplace/store/${store.slug}`} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-ochre-50 px-3 py-2 text-sm font-semibold text-ochre-700 hover:bg-ochre-100">
              {store.sellerType === "pro" ? <CalendarCheck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              {store.sellerType === "pro" ? "Book" : "Shop"} {store.storeName}
              {store.ratingAvg > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs">
                  <Star className="h-3.5 w-3.5 fill-current" /> {store.ratingAvg.toFixed(1)}
                </span>
              )}
            </Link>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {mine ? (
              <button onClick={() => setEdit(true)} className="h-10 rounded-full bg-white px-5 font-display text-sm font-semibold shadow-card">
                Edit profile
              </button>
            ) : (
              <FollowButton userId={user.id} initial={following} run={run} onChange={(_, n) => setFollowers(n)} />
            )}
            <button
              onClick={async () => {
                const url = `${window.location.origin}/community/u/${user.handle}`;
                if (navigator.share) await navigator.share({ title: user.name, url }).catch(() => {});
                else {
                  await navigator.clipboard?.writeText(url).catch(() => {});
                  flash("Profile link copied");
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold shadow-card"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </header>

      <nav className="mt-8 flex justify-center gap-1 border-t border-ink/10" aria-label="Profile sections">
        {[
          { id: "grid" as const, label: "Posts", icon: Grid3x3 },
          { id: "feed" as const, label: "Feed", icon: Rows3 },
          ...(mine ? [{ id: "saved" as const, label: "Saved", icon: Bookmark }] : []),
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("-mt-px inline-flex h-12 items-center gap-1.5 border-t-2 px-4 font-display text-xs font-semibold uppercase tracking-wider", tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-muted")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </nav>
      <div className="mt-2">
        {tab === "grid" && <PostGrid filter={`user:${user.id}`} />}
        {tab === "feed" && (
          <div className="mx-auto max-w-[620px]">
            <Feed filter={`user:${user.id}`} run={run} flash={flash} />
          </div>
        )}
        {tab === "saved" && <PostGrid filter="saved" />}
      </div>

      <AnimatePresence>{edit && <EditProfile user={user} onClose={() => setEdit(false)} onSaved={(h) => (setEdit(false), flash("Profile saved"), router.replace(`/community/u/${h}`), router.refresh())} />}</AnimatePresence>
      {toast}
    </div>
  );
}

function EditProfile({ user, onClose, onSaved }: { user: Props["user"]; onClose: () => void; onSaved: (handle: string) => void }) {
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [bio, setBio] = useState(user.bio);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal aria-label="Edit profile">
      <motion.form
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            const d = await act({ action: "profile", name, handle, bio });
            onSaved(d.handle);
          } catch (x) {
            setErr((x as Error).message);
            setBusy(false);
          }
        }}
        className="w-full max-w-md space-y-3 rounded-t-[1.75rem] bg-white p-5 sm:rounded-[1.75rem]"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold">Edit profile</p>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-sm font-medium">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 h-11 w-full rounded-2xl border border-ink/10 px-3.5 outline-none focus:border-savanna-500" />
        </label>
        <label className="block text-sm font-medium">
          Username
          <span className="mt-1 flex h-11 items-center rounded-2xl border border-ink/10 px-3.5 focus-within:border-savanna-500">
            <span className="text-ink-muted">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} maxLength={24} className="h-full flex-1 bg-transparent outline-none" />
          </span>
        </label>
        <label className="block text-sm font-medium">
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} placeholder="Where you're from, where you're heading, what you do" className="mt-1 w-full rounded-2xl border border-ink/10 px-3.5 py-2.5 outline-none focus:border-savanna-500" />
        </label>
        {err && <p className="text-sm text-maasai-600">{err}</p>}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-savanna-500 font-display font-semibold text-white disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </motion.form>
    </motion.div>
  );
}
