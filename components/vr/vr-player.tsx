"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Footprints,
  Hand,
  Lock,
  Maximize,
  Menu,
  Minimize,
  Moon,
  Orbit,
  Route,
  Smartphone,
  Sun,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MODES, MODE_BY_ID, getVR, modesFor, type TimeOfDay, type TravelMode } from "@/lib/data/vr";
import { MODE_ICON } from "./mode-icons";
import { useSearchParams } from "next/navigation";
import { Car, Plane } from "lucide-react";

import { useActivity, useProfile, useStats } from "@/lib/hooks/store";
import { cn, unsplash } from "@/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Switch } from "../ui/primitives";
import { ImmersiveView } from "./immersive-view";
import { requestMotionPermission } from "./look-controls";

/** Seconds of a premium scene a free user can explore before the lock screen. */
const TEASER_SECONDS = 45;

export function VRPlayer({ slug }: { slug: string }) {
  const d = getVR(slug)!;
  const [profile, setProfile] = useProfile();
  const { log } = useActivity();
  const { bump } = useStats();

  const [time, setTime] = useState<TimeOfDay>("day");
  const [sound, setSound] = useState(false);
  const [autoTour, setAutoTour] = useState(true);
  const [autoPan, setAutoPan] = useState(true);
  const [gyro, setGyro] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [locked, setLocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hint, setHint] = useState(true);

  const hasNight = d.scenes.some((s) => s.time === "night");
  const available = useMemo(() => modesFor(d), [d]);
  const params = useSearchParams();
  const [mode, setMode] = useState<TravelMode | "all">(() => {
    const m = params.get("mode") as TravelMode | null;
    return m && available.has(m) ? m : "all";
  });
  const path = useMemo(() => {
    const byMode = mode === "all" ? d.scenes : d.scenes.filter((s) => s.mode === mode);
    const m = byMode.filter((s) => s.time === time);
    return m.length ? m : byMode.length ? byMode : d.scenes;
  }, [d.scenes, time, mode]);
  const [sceneId, setSceneId] = useState(() => {
    const m = params.get("mode");
    const pool = m ? d.scenes.filter((s) => s.mode === m) : d.scenes;
    return (pool.find((s) => !s.premium) ?? pool[0] ?? d.scenes[0]).id;
  });
  const scene = d.scenes.find((s) => s.id === sceneId) ?? d.scenes[0];
  const idx = Math.max(0, path.findIndex((s) => s.id === scene.id));
  const simulatedNight = time === "night" && scene.time === "day";
  const canWatch = !scene.premium || profile.premium;
  const rootRef = useRef<HTMLDivElement>(null);
  const started = useRef(Date.now());
  const photos = [d.cover, ...d.gallery];
  const photoFor = (i: number) => photos[i % photos.length];

  useEffect(() => {
    setPanelOpen(window.innerWidth >= 1024);
    setIsTouch(matchMedia("(pointer: coarse)").matches);
    bump("vrViews");
    log({ kind: "vr", text: `Explored ${d.name} in 360°`, href: `/vr/${d.slug}` });
    started.current = Date.now();
    return () => {
      const mins = Math.round((Date.now() - started.current) / 60000);
      if (mins > 0) bump("vrMinutes", mins);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.slug]);

  useEffect(() => {
    setLocked(false);
    setProgress(0);
    setHint(true);
    const t = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(t);
  }, [scene.id]);

  const go = useCallback(
    (dir: 1 | -1) => {
      const i = path.findIndex((s) => s.id === scene.id);
      setSceneId(path[(i + dir + path.length) % path.length].id);
    },
    [path, scene.id],
  );
  const onEnded = useCallback(() => (autoTour ? go(1) : setSceneId((id) => id)), [autoTour, go]);
  const onProgress = useCallback(
    ({ current, duration, watched }: { current: number; duration: number; watched: number }) => {
      setProgress(Math.min(1, current / duration));
      if (!canWatch && watched > TEASER_SECONDS) setLocked(true);
    },
    [canWatch],
  );

  const changeMode = (m: TravelMode | "all") => {
    setMode(m);
    const pool = m === "all" ? d.scenes : d.scenes.filter((s) => s.mode === m);
    const pick = pool.find((s) => s.time === time && (!s.premium || profile.premium)) ?? pool.find((s) => !s.premium || profile.premium) ?? pool[0];
    if (pick) setSceneId(pick.id);
  };

  const changeTime = (t: TimeOfDay) => {
    setTime(t);
    // stay inside the chosen travel mode — never jump from Walk to a Drive scene just because it's night
    const pool = mode === "all" ? d.scenes : d.scenes.filter((s) => s.mode === mode);
    const match = pool.find((s) => s.time === t && (!s.premium || profile.premium)) ?? pool.find((s) => s.time === t);
    if (match) setSceneId(match.id);
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await rootRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* unsupported */
    }
  }, []);
  useEffect(() => {
    const f = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageDown" || e.key === "w") go(1);
      else if (e.key === "ArrowDown" || e.key === "PageUp" || e.key === "s") go(-1);
      else if (e.key === "m") setSound((s) => !s);
      else if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen]);

  const next = path[(idx + 1) % path.length];
  const prev = path[(idx - 1 + path.length) % path.length];

  return (
    <div ref={rootRef} className="fixed inset-0 overflow-hidden bg-night text-white">
      <div className={cn("absolute inset-0 transition-[filter] duration-1000", simulatedNight && "[filter:brightness(0.45)_saturate(0.7)_hue-rotate(-15deg)_contrast(1.1)]")}>
        <ImmersiveView
          scene={scene}
          poster={unsplash(photoFor(idx), 1920)}
          muted={!sound}
          autoPan={autoPan}
          gyro={gyro}
          halted={locked}
          onEnded={onEnded}
          onProgress={onProgress}
        />
      </div>

      {/* grading */}
      <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,21,18,0.7)_100%)]" />
      <AnimatePresence>
        {time === "night" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-[#0b1440]/50 via-transparent to-[#0b1440]/40">
            {simulatedNight &&
              STARS.map((s, i) => (
                <span key={i} className="absolute rounded-full bg-white" style={{ left: `${s[0]}%`, top: `${s[1]}%`, width: s[2], height: s[2], opacity: 0.35 + (i % 5) / 10 }} />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-night/55 to-transparent p-4 sm:p-6">
        <div className="pointer-events-auto flex min-w-0 items-center gap-3">
          <Link href="/vr" className={buttonVariants({ variant: "glass", size: "icon" })} aria-label="Back to experiences">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-xs text-white/70">
              {d.region} · {d.type}
            </p>
            <h1 className="truncate text-lg font-bold text-white sm:text-2xl">{d.name}</h1>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {isTouch && (
            <Button
              variant="glass"
              size="icon"
              className={cn(gyro && "bg-savanna-500/80")}
              onClick={async () => setGyro(!gyro && (await requestMotionPermission()))}
              aria-label="Look around by moving your phone"
            >
              <Smartphone className="h-5 w-5" />
            </Button>
          )}
          <Button variant="glass" size="icon" onClick={() => setSound((s) => !s)} aria-label={sound ? "Mute ambient sound" : "Play ambient sound"}>
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button variant="glass" size="icon" onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="hidden sm:inline-flex">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
          {!panelOpen && (
            <Button variant="glass" size="icon" onClick={() => setPanelOpen(true)} aria-label="Open panel">
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Go Fly / Go Walk / Go Drive */}
      <div className={cn("absolute left-1/2 top-20 z-10 -translate-x-1/2 sm:top-6", panelOpen && "lg:left-[calc(50%-190px)]")}>
        <div className="glass flex items-center gap-1 rounded-full p-1" role="radiogroup" aria-label="How do you want to explore?">
          {MODES.map((m) => {
            const Icon = MODE_ICON[m.id];
            const on = mode === m.id;
            const has = available.has(m.id);
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                disabled={!has}
                onClick={() => changeMode(on ? "all" : m.id)}
                title={has ? m.blurb : `No ${m.label.toLowerCase()} footage for ${d.name} yet`}
                className={cn(
                  "relative inline-flex items-center gap-1 rounded-full px-2.5 py-2 font-display text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                  on ? "text-ink" : "text-white hover:bg-white/10",
                  !has && "cursor-not-allowed opacity-35 hover:bg-transparent",
                )}
              >
                {on && <motion.span layoutId="vr-mode" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <Icon className="relative h-4 w-4" />
                <span className="relative sm:hidden">{m.label}</span>
                <span className="relative hidden sm:inline">{m.verb}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* look-around hint */}
      <AnimatePresence>
        {hint && !locked && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("pointer-events-none absolute left-1/2 top-[64%] z-10 -translate-x-1/2", panelOpen && "lg:left-[calc(50%-200px)]")}>
            <div className="glass flex items-center gap-3 rounded-full px-5 py-3 font-display text-sm font-semibold">
              <Hand className="h-5 w-5 animate-floaty" /> {isTouch ? "Drag or tilt your phone to look around" : "Drag or scroll to look around"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* walk arrows */}
      {path.length > 1 && (
        <>
          <WalkArrow side="left" label={prev.spot} onClick={() => go(-1)} className={cn(panelOpen && "lg:left-6")} />
          <WalkArrow side="right" label={next.spot} onClick={() => go(1)} className={cn(panelOpen && "lg:right-[412px]")} />
        </>
      )}

      {/* bottom: spot + path */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night/75 via-night/15 to-transparent p-4 pt-16 sm:p-6 sm:pt-20", panelOpen && "lg:pr-[400px]")}>
        <div className="pointer-events-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/75">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              Spot {idx + 1} of {path.length}
            </span>
            {(() => {
              const SI = MODE_ICON[scene.mode];
              return (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-ink">
                  <SI className="h-3 w-3" /> {MODE_BY_ID[scene.mode].doing}
                </span>
              );
            })()}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              {scene.time === "day" && !simulatedNight ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {simulatedNight ? "Dusk mode" : scene.time === "day" ? "Day" : "Night"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <Orbit className="h-3 w-3" /> 360°
            </span>
            {scene.premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ochre-400 px-2 py-0.5 font-semibold text-ink">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </div>
          <p className="mt-1.5 font-display text-xl font-semibold sm:text-2xl">{scene.title}</p>
          {/* path */}
          <div className="scrollbar-none mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {path.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSceneId(s.id)}
                className={cn(
                  "group relative flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-all",
                  s.id === scene.id ? "border-savanna-400 bg-savanna-500/30" : "border-white/15 bg-night/40 hover:bg-white/10",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(photoFor(i), 80, 80)} alt="" className="h-7 w-7 rounded-full object-cover" />
                <span className="font-medium">{s.spot}</span>
                {s.premium && !profile.premium && <Lock className="h-3 w-3 text-ochre-400" />}
              </button>
            ))}
          </div>
          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-savanna-400 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* side panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-6 right-3 top-20 z-20 flex w-[calc(100%-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-night/70 backdrop-blur-2xl sm:right-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="flex items-center gap-2 font-display text-sm font-semibold">
                <Compass className="h-4 w-4 text-savanna-400" /> Explore {d.name}
              </p>
              <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10" onClick={() => setPanelOpen(false)} aria-label="Close panel">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div className="space-y-3.5">
                <Switch dark className="flex" checked={sound} onChange={setSound} label={<span>Ambient sound</span>} />
                <Switch
                  dark
                  className="flex"
                  checked={time === "night"}
                  onChange={(v) => changeTime(v ? "night" : "day")}
                  label={<span>Night mode {!hasNight && <span className="text-xs text-white/50">(simulated dusk)</span>}</span>}
                />
                <Switch dark className="flex" checked={autoPan} onChange={setAutoPan} label={<span>Auto look-around</span>} />
                <Switch dark className="flex" checked={autoTour} onChange={setAutoTour} label={<span>Walk to the next spot automatically</span>} />
              </div>

              <div>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-widest text-white/50">Spots on this walk</p>
                <ul className="space-y-2">
                  {d.scenes.map((s, i) => {
                    const lockedRow = s.premium && !profile.premium;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            if (s.time !== time) setTime(s.time);
                            setSceneId(s.id);
                          }}
                          className={cn("flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors", s.id === scene.id ? "bg-savanna-500/25 ring-1 ring-savanna-400/60" : "hover:bg-white/5")}
                        >
                          <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={unsplash(photoFor(i), 160, 120)} alt="" className="h-full w-full object-cover" loading="lazy" />
                            {lockedRow && (
                              <span className="absolute inset-0 grid place-items-center bg-night/60">
                                <Lock className="h-4 w-4 text-ochre-400" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{s.title}</span>
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-white/55">
                              {s.time === "day" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                              {s.minutes} min · {MODE_BY_ID[s.mode].doing}
                              {lockedRow && <span className="text-ochre-400">{TEASER_SECONDS}s preview</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <p className="text-sm leading-relaxed text-white/75">{d.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <dt className="flex items-center gap-1.5 text-xs text-white/50">
                      <CalendarDays className="h-3.5 w-3.5" /> Best time
                    </dt>
                    <dd className="mt-1 font-medium">{d.bestTime}</dd>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <dt className="flex items-center gap-1.5 text-xs text-white/50">
                      <Route className="h-3.5 w-3.5" /> From Nairobi
                    </dt>
                    <dd className="mt-1 font-medium">{d.fromNairobi}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="border-t border-white/10 p-4">
              <Link href={`/planner?place=${d.plannerId}`} className={cn(buttonVariants({ size: "md" }), "w-full")}>
                Plan this trip for real <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* premium lock */}
      <AnimatePresence>
        {locked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-night/80 p-6 backdrop-blur-md">
            <div className="max-w-md text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ochre-400 text-ink">
                <Lock className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-white">That was the free preview</h2>
              <p className="mt-2 text-white/70">Tembea Premium unlocks every full 360° walk, night scenes and offline trips.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  variant="ochre"
                  size="lg"
                  onClick={() => {
                    setProfile({ ...profile, premium: true });
                    setLocked(false);
                  }}
                >
                  <Crown className="h-5 w-5" /> Unlock Premium (demo)
                </Button>
                <Button
                  variant="glass"
                  size="lg"
                  onClick={() => {
                    const free = d.scenes.find((s) => !s.premium);
                    if (free) setSceneId(free.id);
                  }}
                >
                  Walk a free spot
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WalkArrow({ side, label, onClick, className }: { side: "left" | "right"; label: string; onClick: () => void; className?: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group absolute top-1/2 z-10 hidden -translate-y-1/2 items-center gap-2 rounded-full bg-night/40 p-2 text-white backdrop-blur transition-all hover:bg-night/70 sm:flex",
        side === "left" ? "left-4 flex-row" : "right-4 flex-row-reverse",
        className,
      )}
      aria-label={`Walk to ${label}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
        <Icon className="h-5 w-5" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 font-display text-sm font-semibold transition-all duration-300 group-hover:max-w-[200px] group-hover:pr-2">{label}</span>
    </button>
  );
}

const STARS: [number, number, number][] = Array.from({ length: 60 }, (_, i) => [(i * 37.7) % 100, ((i * 53.3) % 55) + 2, i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1]);
