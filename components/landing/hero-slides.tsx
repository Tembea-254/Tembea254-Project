"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { IMG } from "@/lib/data/images";
import { PLACE_BY_ID } from "@/lib/data/places";
import { cn, money, unsplash } from "@/lib/utils";

export const HERO_SLIDES = [
  { img: IMG.maraMigration, kind: "Bush", place: "Maasai Mara", line: "Big cats & balloon safaris", placeId: "maasai-mara" },
  { img: IMG.dianiPalms, kind: "Beach", place: "Diani Beach", line: "White sand & reef snorkelling", placeId: "diani" },
  { img: IMG.amboseliKili, kind: "Mountains", place: "Amboseli", line: "Elephants under Kilimanjaro", placeId: "amboseli" },
  { img: IMG.nakuruFlamingos, kind: "Lakes", place: "Lake Nakuru", line: "Flamingos & rhino sanctuary", placeId: "lake-nakuru" },
  { img: IMG.lamuDhow, kind: "Coast culture", place: "Lamu", line: "Dhows & Swahili old town", placeId: "lamu" },
  { img: IMG.mountKenya, kind: "Highlands", place: "Mount Kenya", line: "Forest hikes & Ol Pejeta", placeId: "mount-kenya" },
  { img: IMG.nairobiSkyline, kind: "City", place: "Nairobi", line: "Safari in the city, rooftops at night", placeId: "nairobi" },
] as const;

const INTERVAL = 6500;

/** Full-bleed rotating hero imagery: cross-fade + slow Ken Burns pan, with a caption for the current offer. */
export function HeroSlides({ onChange }: { onChange?: (i: number) => void }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-motion");
    if (reduce || paused) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % HERO_SLIDES.length), INTERVAL);
    return () => window.clearInterval(t);
  }, [paused]);

  useEffect(() => {
    onChange?.(i);
  }, [i, onChange]);

  // preload next image
  useEffect(() => {
    const n = new Image();
    n.src = unsplash(HERO_SLIDES[(i + 1) % HERO_SLIDES.length].img, 2000);
  }, [i]);

  const s = HERO_SLIDES[i];
  const from = PLACE_BY_ID[s.placeId]?.stays.budget.perNight;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence initial={false}>
        <motion.div key={s.img} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(s.img, 2000)} alt={`${s.place} — ${s.line}`} className="animate-kenburns h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>

      {/* legibility: light wash on the left for copy, darker at the bottom for the caption */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F3F8F5] via-[#F3F8F5]/85 to-[#F3F8F5]/0 lg:via-[#F3F8F5]/70" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night/40 to-transparent" />

      {/* caption + progress */}
      <div className="pointer-events-auto absolute bottom-6 right-4 z-10 flex flex-col items-end gap-3 sm:right-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.place}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="hidden items-center gap-3 rounded-2xl bg-white/90 py-2 pl-2 pr-4 shadow-lift backdrop-blur sm:flex"
          >
            <span className="rounded-xl bg-ink px-2.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-white">{s.kind}</span>
            <span>
              <span className="flex items-center gap-1 font-display text-sm font-bold text-ink">
                <MapPin className="h-3.5 w-3.5 text-maasai-500" /> {s.place}
              </span>
              <span className="block text-xs text-ink-muted">
                {s.line}
                {from ? ` · stays from ${money(from)}/night` : ""}
              </span>
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-1.5" role="tablist" aria-label="Hero destinations">
          {HERO_SLIDES.map((x, j) => (
            <button
              key={x.place}
              onClick={() => setI(j)}
              role="tab"
              aria-selected={i === j}
              aria-label={`Show ${x.place}`}
              className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/60 transition-all", i === j ? "w-10" : "w-4 hover:bg-white")}
            >
              {i === j && !paused && <span key={i} className="absolute inset-y-0 left-0 bg-savanna-500" style={{ animation: `slidebar ${INTERVAL}ms linear forwards` }} />}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes slidebar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}
