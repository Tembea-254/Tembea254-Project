"use client";

import { Heart, Star, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";

/** ★★★★☆ 4.6 (128) */
export function Stars({ value, count, size = "sm", className }: { value: number; count?: number; size?: "xs" | "sm" | "md"; className?: string }) {
  const px = size === "xs" ? "h-3 w-3" : size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  if (!value && !count) return <span className={cn("text-xs text-ink-muted", className)}>New</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}>
      <span className="relative inline-flex">
        <span className="flex text-ink/15">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(px, "fill-current")} />
          ))}
        </span>
        <span className="absolute inset-0 flex overflow-hidden text-ochre-400" style={{ width: `${(value / 5) * 100}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(px, "shrink-0 fill-current")} />
          ))}
        </span>
      </span>
      <span className={cn("font-semibold text-ink", size === "md" ? "text-base" : "text-xs")}>{value.toFixed(1)}</span>
      {count != null && <span className={cn("text-ink-muted", size === "md" ? "text-sm" : "text-xs")}>({count})</span>}
    </span>
  );
}

export function ExpressBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md bg-ink px-1.5 py-0.5 font-display text-[10px] font-bold uppercase italic tracking-wide text-ochre-400", className)}>
      <Zap className="h-3 w-3 fill-current" /> Express
    </span>
  );
}

/* ----------------------------- wishlist ----------------------------- */

let ids: Set<string> = new Set();
let loaded = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const EMPTY = new Set<string>();

export function useWishlist() {
  const { status } = useSession();
  const { openLogin } = useLoginGate();
  const snap = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => ids,
    () => EMPTY,
  );
  useEffect(() => {
    if (status !== "authenticated" || loaded) return;
    loaded = true;
    fetch("/api/shop/wishlist")
      .then((r) => r.json())
      .then((d) => {
        ids = new Set(d.ids ?? []);
        emit();
      })
      .catch(() => (loaded = false));
  }, [status]);
  const toggle = useCallback(
    async (id: string) => {
      if (status !== "authenticated") return openLogin({ reason: "Sign in to save listings to your wishlist." });
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      ids = next;
      emit();
      await fetch("/api/shop/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
    },
    [status, openLogin],
  );
  return { has: (id: string) => snap.has(id), toggle, ids: snap };
}

export function WishButton({ id, className }: { id: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const on = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save for later"}
      className={cn("grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur transition-transform active:scale-90", className)}
    >
      <Heart key={String(on)} className={cn("h-[18px] w-[18px]", on ? "animate-bump fill-maasai-500 text-maasai-500" : "text-ink")} />
    </button>
  );
}
