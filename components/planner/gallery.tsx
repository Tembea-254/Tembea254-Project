"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Orbit, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, unsplash } from "@/lib/utils";
import { buttonVariants } from "../ui/button";

export function Gallery({
  open,
  onClose,
  title,
  photos,
  vrSlug,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  photos: string[];
  vrSlug?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!open) return;
    setI(0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, photos.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex flex-col bg-night/95 p-4 text-white backdrop-blur sm:p-8" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60">
                Photo {i + 1} of {photos.length}
              </p>
              <h2 className="font-display text-xl font-bold text-white">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {vrSlug && (
                <Link href={`/vr/${vrSlug}`} className={buttonVariants({ size: "sm" })}>
                  <Orbit className="h-4 w-4" /> Walk it in 360°
                </Link>
              )}
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close gallery">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="relative mt-4 flex-1">
            <AnimatePresence mode="wait">
              <motion.img
                key={photos[i]}
                src={unsplash(photos[i], 1800)}
                alt={`${title} photo ${i + 1}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 h-full w-full rounded-3xl object-contain"
              />
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button onClick={() => setI((i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-night/60 hover:bg-night/80" aria-label="Previous photo">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => setI((i + 1) % photos.length)} className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-night/60 hover:bg-night/80" aria-label="Next photo">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <div className="scrollbar-none mt-4 flex justify-center gap-2 overflow-x-auto">
            {photos.map((p, j) => (
              <button key={p} onClick={() => setI(j)} className={cn("h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2", j === i ? "border-savanna-400" : "border-transparent opacity-60")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(p, 200, 140)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
