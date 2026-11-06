"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Trip } from "../planner/types";
import type { Currency } from "../utils";

/**
 * Tiny localStorage-backed store with cross-component sync.
 * Swap these functions for real API calls (Supabase, Firebase, your own backend) later —
 * the components only use the hooks below.
 */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

const cache = new Map<string, { raw: string | null; value: unknown }>();
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  cache.set(key, { raw, value });
  return value;
}
function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — keep working in memory */
    cache.set(key, { raw: "__mem__" + Math.random(), value });
  }
  emit();
}

function usePersisted<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      write(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set] as const;
}

/* ---------------- Trips ---------------- */

const EMPTY_TRIPS: Trip[] = [];

/* Server sync: trips are kept locally (works offline) and mirrored to the account when signed in. */
const pending = new Map<string, number>();
function pushTrip(trip: Trip) {
  window.clearTimeout(pending.get(trip.id));
  pending.set(
    trip.id,
    window.setTimeout(() => {
      pending.delete(trip.id);
      fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip }) }).catch(() => {});
    }, 1200),
  );
}
let pulled = false;

export function useTrips() {
  const [trips, setTrips] = usePersisted<Trip[]>("tembea.trips", EMPTY_TRIPS);

  // once per page load: merge trips saved to the account on other devices
  useEffect(() => {
    if (pulled) return;
    pulled = true;
    fetch("/api/trips")
      .then((r) => (r.ok ? r.json() : { trips: [] }))
      .then(({ trips: remote }: { trips: Trip[] }) => {
        if (!remote?.length) return;
        setTrips((local) => {
          const byId = new Map(local.map((t) => [t.id, t]));
          for (const r of remote) {
            const l = byId.get(r.id);
            if (!l || (r.updatedAt ?? 0) > (l.updatedAt ?? 0)) byId.set(r.id, r);
          }
          return [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        });
      })
      .catch(() => {});
  }, [setTrips]);

  const saveTrip = useCallback(
    (trip: Trip) =>
      setTrips((prev) => {
        const i = prev.findIndex((t) => t.id === trip.id);
        const next = { ...trip, updatedAt: Date.now() };
        pushTrip(next);
        if (i === -1) return [next, ...prev];
        const copy = [...prev];
        copy[i] = next;
        return copy;
      }),
    [setTrips],
  );
  const deleteTrip = useCallback(
    (id: string) => {
      fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteId: id }) }).catch(() => {});
      setTrips((prev) => prev.filter((t) => t.id !== id));
    },
    [setTrips],
  );
  return { trips, saveTrip, deleteTrip };
}

/* ---------------- Profile ---------------- */

export interface Profile {
  name: string;
  email: string;
  currency: Currency;
  language: string;
  premium: boolean;
  homeCountry: string;
}
const DEFAULT_PROFILE: Profile = { name: "Traveller", email: "", currency: "KES", language: "en", premium: false, homeCountry: "Kenya" };
export function useProfile() {
  return usePersisted<Profile>("tembea.profile", DEFAULT_PROFILE);
}

/* ---------------- Activity feed & stats ---------------- */

export interface ActivityEvent {
  id: string;
  at: number;
  kind: "trip" | "vr" | "translate" | "settings";
  text: string;
  href?: string;
}
const EMPTY_EVENTS: ActivityEvent[] = [];
export function useActivity() {
  const [events, setEvents] = usePersisted<ActivityEvent[]>("tembea.activity", EMPTY_EVENTS);
  const log = useCallback(
    (e: Omit<ActivityEvent, "id" | "at">) =>
      setEvents((prev) => [{ ...e, id: Math.random().toString(36).slice(2), at: Date.now() }, ...prev].slice(0, 40)),
    [setEvents],
  );
  return { events, log };
}

export interface Stats {
  vrViews: number;
  vrMinutes: number;
  translations: number;
}
const EMPTY_STATS: Stats = { vrViews: 0, vrMinutes: 0, translations: 0 };
export function useStats() {
  const [stats, setStats] = usePersisted<Stats>("tembea.stats", EMPTY_STATS);
  const bump = useCallback((k: keyof Stats, by = 1) => setStats((s) => ({ ...s, [k]: (s[k] ?? 0) + by })), [setStats]);
  return { stats, bump };
}

/** true after the first client render — use to avoid hydration mismatches for storage-driven UI */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}
