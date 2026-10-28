"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Moon, Orbit, Play, Sun } from "lucide-react";
import { modesFor, type TravelMode, type VRDestination } from "@/lib/data/vr";
import { MODE_ICON } from "./mode-icons";
import { cn, unsplash } from "@/lib/utils";
import { Badge } from "../ui/primitives";

const TYPE_TONE = { Safari: "ochre", Cultural: "violet", Beach: "green", City: "neutral" } as const;

export function DestinationCard({ d, index = 0, premiumUser, mode }: { d: VRDestination; index?: number; premiumUser: boolean; mode?: TravelMode | null }) {
  const modes = modesFor(d);
  const has360 = true;
  const hasNight = d.scenes.some((s) => s.time === "night");
  const freeScenes = d.scenes.filter((s) => !s.premium).length;
  const allPremium = freeScenes === 0;
  const locked = allPremium && !premiumUser;
  const freeMinutes = d.scenes.filter((s) => !s.premium).reduce((a, s) => a + s.minutes, 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="group relative overflow-hidden rounded-3xl bg-ink shadow-card"
    >
      <Link href={`/vr/${d.slug}${mode ? `?mode=${mode}` : ""}`} className="block" aria-label={`Enter virtual preview of ${d.name}`}>
        <div className="relative aspect-[4/5] sm:aspect-[5/6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={unsplash(d.cover, 900, 1080)}
            alt={d.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={TYPE_TONE[d.type]}>{d.type}</Badge>
              {has360 && (
                <Badge tone="glass">
                  <Orbit className="h-3 w-3" /> 360°
                </Badge>
              )}
            </div>
            {locked ? (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ochre-400 text-ink shadow-lg" title="Premium experience">
                <Lock className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-night/50 px-2 py-1 text-white/90 backdrop-blur">
                <Sun className="h-3.5 w-3.5" />
                {hasNight && <Moon className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-white/70">
                {d.region} · {d.level}
              </p>
              <span className="flex items-center gap-1" aria-label={`Modes: ${[...modes].join(", ")}`}>
                {(["fly", "walk", "drive", "view"] as const).map((m) => {
                  const I = MODE_ICON[m];
                  return (
                    <span key={m} className={cn("grid h-6 w-6 place-items-center rounded-full", modes.has(m) ? (mode === m ? "bg-savanna-500" : "bg-white/20") : "bg-white/5 opacity-30")} title={m}>
                      <I className="h-3.5 w-3.5" />
                    </span>
                  );
                })}
              </span>
            </div>
            <h3 className="mt-1 text-2xl font-bold text-white">{d.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/80">{d.tagline}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 font-display text-sm font-semibold transition-all",
                  locked ? "bg-ochre-400 text-ink" : "bg-white text-ink group-hover:bg-savanna-500 group-hover:text-white",
                )}
              >
                {locked ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                {locked ? "Premium preview" : "Enter 360° preview"}
              </span>
              <span className="text-right text-[11px] leading-tight text-white/70">
                {d.scenes.length} spots
                <br />
                {allPremium ? "Premium" : `${freeMinutes}+ min free`}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
