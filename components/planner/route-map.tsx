"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Pause, Play, RotateCcw } from "lucide-react";
import { PLACE_BY_ID } from "@/lib/data/places";
import { estimateLeg } from "@/lib/planner/engine";
import type { TransportMode } from "@/lib/planner/transport";
import type { Day, Stop } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

type LatLng = [number, number];

const MODE_COLOR: Record<TransportMode, string> = {
  drive: "#0E2E24",
  van: "#C8102E",
  bus: "#0E8A4D",
  ferry: "#1b6fa8",
  train: "#D98E04",
  flight: "#5B3FD1",
};

/* Road geometry from the public OSRM router (OpenStreetMap data), cached per leg. */
const roadCache = new Map<string, LatLng[]>();
async function roadPath(a: LatLng, b: LatLng): Promise<LatLng[] | null> {
  const key = `${a.join()}|${b.join()}`;
  if (roadCache.has(key)) return roadCache.get(key)!;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=simplified&geometries=geojson`;
    const r = (await fetch(url).then((x) => x.json())) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
    const pts = r.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);
    if (pts?.length) {
      roadCache.set(key, pts);
      return pts;
    }
  } catch {
    /* offline or rate-limited: fall back to a straight line */
  }
  return null;
}

/** Gentle great-circle-ish arc for flights. */
function arc(a: LatLng, b: LatLng, n = 32): LatLng[] {
  const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const ctrl: LatLng = [mid[0] + dx * 0.18, mid[1] - dy * 0.18];
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * b[1]] as LatLng;
  });
}

function pin(label: string, active: boolean, done: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="tm-pin ${active ? "tm-pin--active" : ""}" style="${done ? "" : ""}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const traveller = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#F2B13A;border:3px solid #fff;box-shadow:0 0 0 6px rgba(242,177,58,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Fit({ points, focus }: { points: LatLng[]; focus?: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.flyTo(focus, Math.max(map.getZoom(), 9), { duration: 0.8 });
      return;
    }
    if (points.length === 1) map.setView(points[0], 8);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
  }, [map, points, focus]);
  return null;
}

interface Seg {
  from: number;
  to: number;
  mode: TransportMode;
  path: LatLng[];
}

export default function RouteMap({
  stops,
  days,
  travelers = 2,
  activePlaceId,
  onDay,
}: {
  stops: Stop[];
  days?: Day[];
  travelers?: number;
  activePlaceId?: string;
  onDay?: (dayIndex: number) => void;
}) {
  const points = useMemo(() => stops.map((s) => PLACE_BY_ID[s.placeId].coords as LatLng), [stops]);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(1); // 0..1 of the whole route drawn
  const raf = useRef(0);

  // Build segments (road geometry where it makes sense)
  useEffect(() => {
    let dead = false;
    const base: Seg[] = stops.slice(1).map((s, i) => {
      const leg = estimateLeg(stops[i].placeId, s.placeId, s.arriveBy, travelers);
      const a = points[i];
      const b = points[i + 1];
      return { from: i, to: i + 1, mode: leg.mode, path: leg.mode === "flight" ? arc(a, b) : [a, b] };
    });
    setSegs(base);
    Promise.all(
      base.map(async (sg) => {
        if (sg.mode === "flight" || sg.mode === "train") return sg;
        const road = await roadPath(points[sg.from], points[sg.to]);
        return road ? { ...sg, path: road } : sg;
      }),
    ).then((full) => !dead && setSegs(full));
    return () => {
      dead = true;
    };
  }, [stops, points, travelers]);

  // Day → which stop the traveller sleeps at
  const dayStop = useMemo(() => {
    if (!days) return [] as number[];
    return days.map((d) => Math.max(0, stops.findIndex((s) => s.placeId === d.placeId)));
  }, [days, stops]);

  // Full route as one path for the "Play route" animation
  const full = useMemo(() => segs.flatMap((s, i) => (i === 0 ? s.path : s.path.slice(1))), [segs]);
  const cut = Math.max(1, Math.round(progress * (full.length - 1)));
  const drawn = full.slice(0, cut + 1);
  const head = drawn[drawn.length - 1];

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - progress * 9000;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 9000);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const focusStop = activeDay != null ? dayStop[activeDay] : activePlaceId ? stops.findIndex((s) => s.placeId === activePlaceId) : -1;
  const focus = focusStop >= 0 && activeDay != null ? points[focusStop] : activePlaceId && focusStop >= 0 ? points[focusStop] : undefined;

  // Day labels per stop, e.g. "Day 2–4"
  const dayLabels = useMemo(() => {
    const m = new Map<number, number[]>();
    dayStop.forEach((s, d) => m.set(s, [...(m.get(s) ?? []), d + 1]));
    return m;
  }, [dayStop]);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[-1.29, 36.82]} zoom={6} scrollWheelZoom className="h-full w-full" zoomControl={false} attributionControl>
        {/* Same OpenStreetMap (Mapnik) layer as the embed in the brief */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* faint full route */}
        {segs.map((s, i) => (
          <Polyline key={`bg${i}`} positions={s.path} pathOptions={{ color: MODE_COLOR[s.mode], weight: 4, opacity: 0.22, dashArray: s.mode === "flight" || s.mode === "train" ? "6 8" : undefined }} />
        ))}
        {/* traced progress */}
        {progress > 0 && drawn.length > 1 && <Polyline positions={drawn} pathOptions={{ color: "#C8102E", weight: 4, opacity: 0.95, lineCap: "round" }} />}
        {/* active day's arrival leg */}
        {activeDay != null &&
          segs
            .filter((s) => s.to === dayStop[activeDay])
            .map((s, i) => <Polyline key={`act${i}`} positions={s.path} pathOptions={{ color: "#F2B13A", weight: 7, opacity: 0.9 }} />)}

        {stops.map((s, i) => {
          const p = PLACE_BY_ID[s.placeId];
          const ds = dayLabels.get(i) ?? [];
          const label = ds.length ? (ds.length === 1 ? `Day ${ds[0]}` : `Days ${ds[0]}–${ds[ds.length - 1]}`) : "";
          return (
            <Marker key={s.id} position={p.coords} icon={pin(String(i + 1), focusStop === i, false)}>
              <Tooltip direction="top" offset={[0, -14]}>
                <strong>{p.name}</strong>
                {label ? ` · ${label}` : ""} · {s.nights} night{s.nights === 1 ? "" : "s"}
              </Tooltip>
            </Marker>
          );
        })}
        {progress > 0 && progress < 1 && head && <Marker position={head} icon={traveller} />}
        {progress >= 1 && points.length > 0 && <CircleMarker center={points[points.length - 1]} radius={18} pathOptions={{ color: "#14A85F", weight: 2, fillOpacity: 0.08 }} />}
        <Fit points={points} focus={focus} />
      </MapContainer>

      {/* Day-by-day controls */}
      {days && days.length > 0 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] space-y-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (progress >= 1) setProgress(0);
                setActiveDay(null);
                setPlaying((p) => !p);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 font-display text-sm font-semibold text-white shadow-lift"
            >
              {playing ? <Pause className="h-4 w-4" /> : progress >= 1 ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : progress >= 1 ? "Replay route" : "Play route"}
            </button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/80 shadow">
              <div className="h-full bg-maasai-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="scrollbar-none pointer-events-auto flex gap-1.5 overflow-x-auto rounded-2xl bg-white/95 p-1.5 shadow-lift backdrop-blur">
            {days.map((d, i) => (
              <button
                key={d.id}
                onClick={() => {
                  setPlaying(false);
                  setActiveDay(activeDay === i ? null : i);
                  onDay?.(i);
                }}
                className={cn(
                  "shrink-0 rounded-xl px-2.5 py-1.5 text-left transition-colors",
                  activeDay === i ? "bg-ochre-400 text-ink" : "hover:bg-sand-100",
                )}
                title={`${d.title} — ${PLACE_BY_ID[d.placeId].name}`}
              >
                <span className="block font-display text-[10px] font-semibold uppercase tracking-wider opacity-70">Day {i + 1}</span>
                <span className="block max-w-[90px] truncate text-xs font-semibold">{PLACE_BY_ID[d.placeId].name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <a
        href={`https://www.openstreetmap.org/#map=7/${points[0]?.[0] ?? 0.71}/${points[0]?.[1] ?? 37.48}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 z-[500] rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow"
      >
        View larger map
      </a>
    </div>
  );
}
