import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const unsplash = (id: string, w = 1200, h?: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=75`;

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export type Currency = "KES" | "USD" | "EUR" | "GBP";
/** Indicative rates for display only (KES base). Replace with a live FX API later. */
export const FX: Record<Currency, number> = { KES: 1, USD: 1 / 129, EUR: 1 / 140, GBP: 1 / 165 };

export function money(kes: number, currency: Currency = "KES") {
  const v = kes * FX[currency];
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KES" ? 0 : 0,
  }).format(Math.round(v));
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", opts);
}

export function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
