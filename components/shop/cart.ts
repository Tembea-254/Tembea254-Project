"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Shopping cart kept in this browser (localStorage); prices are always re-checked on the server. */
export interface CartLine {
  productId: string;
  /** items, or days / sessions / people for a service */
  qty: number;
  /** services: the date booked (YYYY-MM-DD) */
  date?: string;
  /** services: pick-up point, group size, anything the pro should know */
  note?: string;
}

const same = (l: CartLine, productId: string, date?: string) => l.productId === productId && (l.date ?? "") === (date ?? "");

const KEY = "tembea.cart.v2";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CartLine[] } = { raw: null, value: [] };

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  let value: CartLine[] = [];
  try {
    value = raw ? JSON.parse(raw) : [];
  } catch {
    value = [];
  }
  cache = { raw, value };
  return value;
}
function write(v: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    cache = { raw: "__mem__" + Math.random(), value: v };
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};
const EMPTY: CartLine[] = [];

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((productId: string, qty = 1, extra?: { date?: string; note?: string }) => {
    const cur = read();
    const ex = cur.find((l) => same(l, productId, extra?.date));
    write(ex ? cur.map((l) => (same(l, productId, extra?.date) ? { ...l, qty: extra?.date ? qty : Math.min(20, l.qty + qty), note: extra?.note ?? l.note } : l)) : [...cur, { productId, qty, ...extra }]);
    try {
      window.dispatchEvent(new CustomEvent("tembea:cart-added"));
    } catch {}
  }, []);
  const setQty = useCallback((productId: string, qty: number, date?: string) => {
    const cur = read();
    write(qty <= 0 ? cur.filter((l) => !same(l, productId, date)) : cur.map((l) => (same(l, productId, date) ? { ...l, qty: Math.min(30, qty) } : l)));
  }, []);
  const clear = useCallback(() => write([]), []);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  return { lines, add, setQty, clear, count };
}
