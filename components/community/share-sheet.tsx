"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Link2, X } from "lucide-react";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { FeedPost } from "@/lib/repo/community";
import { cn } from "@/lib/utils";
import { FacebookGlyph, InstagramIcon, TikTokIcon, WhatsAppIcon, XIcon } from "../brand/social-icons";
import { downloadMedia, fetchFile, postUrl } from "./shared";

/** Bottom sheet to share a post to WhatsApp, TikTok, Instagram, Facebook or X — or save it to the phone. */
export function ShareSheet({ post, open, onClose, onShared, flash }: { post: FeedPost; open: boolean; onClose: () => void; onShared: () => void; flash: (m: string) => void }) {
  const place = post.placeId ? PLACE_BY_ID[post.placeId] : undefined;
  const url = postUrl(post.id);
  const caption = `${post.text.slice(0, 220)}${post.text.length > 220 ? "…" : ""}${place ? `\n${place.name}, Kenya` : ""}\n#Tembea254 #VisitKenya${place ? ` #${place.name.replace(/[^A-Za-z]/g, "")}` : ""}`;

  /** TikTok and Instagram have no web share links: use the phone's share sheet with the media, else save it and copy the caption. */
  const toApp = async (app: string) => {
    try {
      const files = await Promise.all(post.media.slice(0, 4).map(fetchFile)).catch(() => [] as File[]);
      if (files.length && navigator.canShare?.({ files })) {
        await navigator.share({ files, text: `${caption}\n${url}` });
        onShared();
        onClose();
        return;
      }
      await navigator.clipboard?.writeText(`${caption}\n${url}`).catch(() => {});
      if (post.media.length) await downloadMedia(post.media);
      onShared();
      flash(`${post.media.length ? "Saved to your device and caption" : "Caption"} copied — open ${app} and paste`);
    } catch {
      /* share sheet dismissed */
    }
    onClose();
  };

  const items = [
    { label: "WhatsApp", icon: WhatsAppIcon, bg: "bg-[#25D366] text-white", href: `https://wa.me/?text=${encodeURIComponent(`${caption}\n${url}`)}` },
    { label: "TikTok", icon: TikTokIcon, bg: "bg-black text-white", run: () => toApp("TikTok") },
    { label: "Instagram", icon: InstagramIcon, bg: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white", run: () => toApp("Instagram") },
    { label: "Facebook", icon: FacebookGlyph, bg: "bg-[#1877F2] text-white", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "X", icon: XIcon, bg: "bg-black text-white", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(url)}` },
    {
      label: "Copy link",
      icon: Link2,
      bg: "bg-sand-100 text-ink",
      run: async () => {
        await navigator.clipboard?.writeText(url).catch(() => {});
        onShared();
        flash("Link copied");
        onClose();
      },
    },
    ...(post.media.length
      ? [
          {
            label: "Save",
            icon: Download,
            bg: "bg-sand-100 text-ink",
            run: async () => {
              flash("Saving to your device…");
              await downloadMedia(post.media);
              onClose();
            },
          },
        ]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-modal role="dialog" aria-label="Share">
          <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 26, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[1.75rem] bg-white p-5 pb-8 sm:rounded-[1.75rem]">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-bold">Share</p>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {items.map((it) => {
                const inner = (
                  <>
                    <span className={cn("grid h-14 w-14 place-items-center rounded-full", it.bg)}>
                      <it.icon className="h-6 w-6" />
                    </span>
                    <span className="text-xs">{it.label}</span>
                  </>
                );
                return "href" in it && it.href ? (
                  <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => (onShared(), onClose())} className="flex flex-col items-center gap-1.5">
                    {inner}
                  </a>
                ) : (
                  <button key={it.label} onClick={"run" in it ? it.run : undefined} className="flex flex-col items-center gap-1.5">
                    {inner}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
