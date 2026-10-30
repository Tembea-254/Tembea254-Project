"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Plus, Radio, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { activeStories } from "@/lib/repo/community";
import { mediaUrl } from "../shop/media";
import { ago, Avatar } from "./shared";

export type StoryGroup = Awaited<ReturnType<typeof activeStories>>[number];
type Live = { id: string; title: string; host: string; scheduledAt: number; status: string };

/** Instagram-style story rings: your story first, then people you follow, then everyone. Live walks show as red rings. */
export function StoriesBar({ groups, me, onCreate, live }: { groups: StoryGroup[]; me: { name: string; image?: string | null } | null; onCreate: () => void; live: Live[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const mine = groups.find((g) => g.mine);
  return (
    <>
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        <button onClick={() => (mine ? setOpen(groups.indexOf(mine)) : onCreate())} className="flex w-[72px] shrink-0 flex-col items-center gap-1">
          <span className="relative">
            <Avatar name={me?.name ?? "You"} image={me?.image} size={64} ring={!!mine} />
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCreate();
              }}
              className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-savanna-500 text-white"
              aria-label="Add to your story"
            >
              <Plus className="h-3.5 w-3.5" />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px]">Your story</span>
        </button>
        {live.map((l) => (
          <Link key={l.id} href="/vr#live" className="flex w-[72px] shrink-0 flex-col items-center gap-1">
            <span className="relative rounded-full bg-maasai-500 p-[2.5px]">
              <span className="grid h-[64px] w-[64px] place-items-center rounded-full border-2 border-white bg-ink text-white">
                <Radio className="h-6 w-6" />
              </span>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-maasai-500 px-1.5 text-[9px] font-bold uppercase text-white">{l.status === "live" ? "Live" : "Soon"}</span>
            </span>
            <span className="w-full truncate text-center text-[11px]">{l.title}</span>
          </Link>
        ))}
        {groups
          .filter((g) => !g.mine)
          .map((g) => (
            <button key={g.userId} onClick={() => setOpen(groups.indexOf(g))} className="flex w-[72px] shrink-0 flex-col items-center gap-1">
              <Avatar name={g.name} image={g.image} size={64} ring />
              <span className="w-full truncate text-center text-[11px]">{g.name.split(" ")[0]}</span>
            </button>
          ))}
      </div>
      <AnimatePresence>{open != null && <StoryViewer groups={groups} start={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

function StoryViewer({ groups, start, onClose }: { groups: StoryGroup[]; start: number; onClose: () => void }) {
  const [g, setG] = useState(start);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const group = groups[g];
  const item = group?.items[i];

  const next = useCallback(() => {
    setProgress(0);
    if (i + 1 < group.items.length) setI(i + 1);
    else if (g + 1 < groups.length) {
      setG(g + 1);
      setI(0);
    } else onClose();
  }, [i, g, group, groups.length, onClose]);
  const prev = () => {
    setProgress(0);
    if (i > 0) setI(i - 1);
    else if (g > 0) {
      setG(g - 1);
      setI(0);
    }
  };

  useEffect(() => {
    if (!item || item.media.type === "video" || paused) return;
    const t = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 2)), 100);
    return () => clearInterval(t);
  }, [item, paused]);
  useEffect(() => {
    if (progress >= 100) next();
  }, [progress, next]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!group || !item) return null;
  const place = item.placeId ? PLACE_BY_ID[item.placeId] : null;

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal aria-label={`${group.name}'s story`}>
      <div className="relative h-full w-full max-w-[480px] sm:h-[92dvh] sm:overflow-hidden sm:rounded-3xl" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
        {item.media.type === "video" ? (
          <video
            ref={video}
            key={item.id}
            src={item.media.url}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100)}
            onEnded={next}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img key={item.id} initial={{ scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 5 }} src={mediaUrl(item.media.url, 1080, 1920)} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3 pb-10">
          <div className="flex gap-1">
            {group.items.map((it, k) => (
              <span key={it.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/35">
                <span className="block h-full bg-white" style={{ width: k < i ? "100%" : k === i ? `${progress}%` : "0%" }} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <Link href={group.handle ? `/community/u/${group.handle}` : "#"} className="flex items-center gap-2">
              <Avatar name={group.name} image={group.image} size={34} />
              <span className="font-display text-sm font-semibold">{group.name}</span>
            </Link>
            <span className="text-xs text-white/70">{ago(item.createdAt)}</span>
            <button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <button onClick={prev} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous" />
        <button onClick={next} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 text-white">
          {item.caption && <p className="text-[15px]">{item.caption}</p>}
          <div className="flex flex-wrap gap-2">
            {place && (
              <Link href={`/community/place/${place.id}`} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <MapPin className="h-3.5 w-3.5" /> {place.name}
              </Link>
            )}
            {item.productId && (
              <Link href={`/marketplace/product/${item.productId}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                <ShoppingBag className="h-3.5 w-3.5" /> See what's tagged
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
