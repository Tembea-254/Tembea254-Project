"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Headset, Moon, Orbit, Play, Search, Volume2 } from "lucide-react";
import { MODES, VR_DESTINATIONS, VR_TYPES, modesFor, type TravelMode, type VRType } from "@/lib/data/vr";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import { MODE_ICON } from "./mode-icons";
import { useMounted, useProfile } from "@/lib/hooks/store";
import { cn, unsplash } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { Chip, Input, Switch } from "../ui/primitives";
import { DestinationCard } from "./destination-card";
import { ImmersiveView } from "./immersive-view";

const FEATURED = VR_DESTINATIONS[0];
const HERO_SCENE = FEATURED.scenes[0];

export function VRBrowser() {
  const [type, setType] = useState<VRType | "All">("All");
  const [mode, setMode] = useState<TravelMode | null>(null);
  const router = useRouter();
  const surprise = () => {
    const pool = VR_DESTINATIONS.filter((d) => !mode || modesFor(d).has(mode));
    const d = pool[Math.floor(Math.random() * pool.length)];
    const m = mode ?? ([...modesFor(d)][Math.floor(Math.random() * modesFor(d).size)] as TravelMode);
    router.push(`/vr/${d.slug}?mode=${m}`);
  };
  const [only360, setOnly360] = useState(false);
  const [nightOnly, setNightOnly] = useState(false);
  const [q, setQ] = useState("");
  const [profile] = useProfile();
  const mounted = useMounted();

  const list = useMemo(
    () =>
      VR_DESTINATIONS.filter(
        (d) =>
          (type === "All" || d.type === type) &&
          (!only360 || d.slug === "kenya-360-safari" || d.scenes.some((s) => /8K/.test(s.title))) &&
          (!nightOnly || d.scenes.some((s) => s.time === "night")) &&
          (!mode || d.scenes.some((s) => s.mode === mode)) &&
          (!q || `${d.name} ${d.region} ${d.tagline}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [type, only360, nightOnly, q, mode],
  );


  return (
    <div>
      {/* Immersive hero — a live, muted walk plays behind the copy, CityWalks-style */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-75">
          <ImmersiveView quiet scene={HERO_SCENE} poster={unsplash(FEATURED.cover, 1600)} muted autoPan gyro={false} halted={false} onEnded={() => {}} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/70 to-night/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-sand-50 to-transparent" />

        <div className="container-page grid gap-10 pb-28 pt-12 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:pb-36">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-display text-xs font-semibold backdrop-blur">
              <Headset className="h-4 w-4 text-ochre-400" /> Virtual pre-visits
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
              Step into Kenya <span className="text-savanna-400">before</span> you go.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
              Stand in the Maasai Mara, walk Lamu's lanes and ride Nairobi's expressway at midnight — {VR_DESTINATIONS.reduce((a, d) => a + d.scenes.length, 0)} immersive 360° spots you can look around with a drag, a scroll or a tilt of your phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/vr/${FEATURED.slug}`} className={buttonVariants({ size: "lg" })}>
                <Play className="h-5 w-5 fill-current" /> Start with the Maasai Mara
              </Link>
              <Link href="/vr/kenya-360-safari" className={buttonVariants({ variant: "glass", size: "lg" })}>
                <Orbit className="h-5 w-5" /> Try 360° mode
              </Link>
            </div>
          </div>
          <div className="hidden items-end justify-end lg:flex">
            <div className="glass w-72 rounded-3xl p-5">
              <p className="font-display text-sm font-semibold">How it works</p>
              <ul className="mt-3 space-y-3 text-sm text-white/80">
                <li className="flex gap-3">
                  <Volume2 className="h-4 w-4 shrink-0 text-savanna-400" /> Turn on ambient sound for real street, ocean and bush audio
                </li>
                <li className="flex gap-3">
                  <Moon className="h-4 w-4 shrink-0 text-ochre-400" /> Flip Day / Night to see the same place after dark
                </li>
                <li className="flex gap-3">
                  <Orbit className="h-4 w-4 shrink-0 text-maasai-100" /> Drag, scroll or tilt your phone to look in every direction
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page -mt-16 relative">
        {/* How do you want to explore? — Fly / Walk / Drive */}
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-lift sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Choose how you arrive</p>
              <h2 className="text-xl font-bold sm:text-2xl">How do you want to explore?</h2>
            </div>
            <button onClick={surprise} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 font-display text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              <Shuffle className="h-4 w-4" /> Surprise me
            </button>
          </div>
          <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {MODES.map((m, i) => {
              const Icon = MODE_ICON[m.id];
              const on = mode === m.id;
              const count = VR_DESTINATIONS.reduce((a, d) => a + d.scenes.filter((s) => s.mode === m.id).length, 0);
              const tone = ["from-dusk-500 to-[#2b1d73]", "from-savanna-500 to-savanna-700", "from-ochre-500 to-maasai-500", "from-[#1b6fa8] to-ink"][i];
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode(on ? null : m.id)}
                  aria-pressed={on}
                  className={cn(
                    "relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-left sm:p-5 text-white transition-shadow",
                    tone,
                    on ? "shadow-lift ring-4 ring-offset-2 ring-ink/80" : "opacity-95 hover:shadow-lift",
                  )}
                >
                  <Icon className="absolute -right-3 -top-3 h-24 w-24 text-white/10" />
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-3 font-display text-lg font-bold sm:mt-4 sm:text-xl">{m.verb}</p>
                  <p className="mt-1 text-xs text-white/80 sm:text-sm">{m.blurb}</p>
                  <p className="mt-3 font-display text-xs font-semibold uppercase tracking-wider text-white/70">
                    {count} 360° {count === 1 ? "scene" : "scenes"}
                    {on ? " · showing" : ""}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-lift sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
              {(["All", ...VR_TYPES] as const).map((t) => (
                <Chip key={t} active={type === t} onClick={() => setType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Switch checked={only360} onChange={setOnly360} label={<span className="font-medium">8K only</span>} />
              <Switch checked={nightOnly} onChange={setNightOnly} label={<span className="font-medium">Has night walk</span>} />
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search destinations" className="pl-9" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((d, i) => (
            <DestinationCard key={d.slug} d={d} index={i} premiumUser={mounted && profile.premium} mode={mode} />
          ))}
        </div>
        {!list.length && (
          <div className="mt-10 rounded-3xl border border-dashed border-ink/15 p-10 text-center text-ink-muted">
            No experiences match those filters yet.{" "}
            <button
              className="font-semibold text-savanna-600"
              onClick={() => {
                setType("All");
                setOnly360(false);
                setNightOnly(false);
                setQ("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <p className={cn("mt-10 text-center text-xs text-ink-muted")}>
          Free spots are open to everyone. Premium unlocks every full-length walk, night scene and 8K collection.
        </p>
      </section>
    </div>
  );
}
