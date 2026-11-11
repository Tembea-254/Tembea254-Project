"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/hooks/store";

type Ad = { id: string; headline: string; body: string; image: string | null; cta: string; sponsor: string };

const img = (u: string | null) => (!u ? "" : /^(https?:|\/)/.test(u) ? u : `https://images.unsplash.com/${u}?auto=format&fit=crop&w=320&h=320&q=70`);
/** pages where an ad would get in the way of paying or recording */
const QUIET = [/^\/checkout/, /^\/scouts\/[^/]+$/, /^\/orders/, /^\/vendor/];
const VISIBLE_MS = 12_000;

/**
 * A small sponsored card that slides in on a timer. Free plan: every ~20 s. Pro: about once an hour.
 * The interval comes from the server (admin settings), so the business can tune it without a release.
 */
export function AdSlot() {
  const pathname = usePathname();
  const [profile] = useProfile();
  const [ad, setAd] = useState<Ad | null>(null);
  const interval = useRef(20);
  const last = useRef("");
  const quiet = QUIET.some((r) => r.test(pathname));
  const placement = pathname.split("/")[1] || "all";

  useEffect(() => {
    if (quiet) return;
    let alive = true;
    let first = true;
    let next = 0;
    let hide = 0;
    const wait = (sec: number) => {
      window.clearTimeout(next);
      next = window.setTimeout(show, sec * 1000);
    };
    async function show() {
      if (!alive) return;
      if (document.hidden) return wait(5);
      try {
        const res = await fetch(`/api/ads?placement=${placement}&exclude=${last.current}${profile.premium ? "&pro=1" : ""}`);
        const d = (await res.json()) as { ad: Ad | null; intervalSec: number };
        interval.current = Math.max(10, d.intervalSec || 20);
        // Pro members: the first check only learns the (long) interval, so they don't get an ad straight away
        if (first && interval.current > 120) {
          first = false;
          return wait(interval.current);
        }
        first = false;
        if (d.ad && alive) {
          last.current = d.ad.id;
          setAd(d.ad);
          window.clearTimeout(hide);
          hide = window.setTimeout(() => setAd(null), VISIBLE_MS);
        }
      } catch {
        /* offline: try again later */
      }
      // the next card comes one full interval after this one has gone
      wait(interval.current + VISIBLE_MS / 1000);
    }
    wait(interval.current);
    return () => {
      alive = false;
      window.clearTimeout(next);
      window.clearTimeout(hide);
    };
  }, [quiet, placement, profile.premium]);

  const close = () => setAd(null);

  if (quiet) return null;
  return (
    <AnimatePresence>
      {ad && (
        <motion.aside
          key={ad.id}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          aria-label="Sponsored"
          className="fixed bottom-24 left-3 right-20 z-40 max-w-sm overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-ink/10 lg:bottom-6 lg:left-[288px] lg:right-auto"
        >
          <div className="flex gap-3 p-3">
            {ad.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img(ad.image)} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{ad.sponsor}</p>
              <p className="mt-0.5 font-display text-sm font-bold leading-snug">{ad.headline}</p>
              {ad.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{ad.body}</p>}
              <div className="mt-2 flex items-center gap-2">
                <a href={`/api/go?ad=${ad.id}`} onClick={() => setAd(null)} className="inline-flex h-8 items-center rounded-full bg-savanna-500 px-3 font-display text-xs font-semibold text-white">
                  {ad.cta}
                </a>
                {!profile.premium && (
                  <Link href="/profile#premium" className="text-[11px] text-ink-muted underline-offset-2 hover:underline">
                    Fewer ads with Pro
                  </Link>
                )}
              </div>
            </div>
            <button onClick={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand-50" aria-label="Close ad">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
