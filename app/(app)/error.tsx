"use client";

import { useEffect } from "react";

/**
 * Shown instead of Next's blank "Application error" screen when a page crashes in the browser.
 * A crash after a new deploy is usually stale code in an open tab, so "Try again" reloads.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // Old code in an open tab asking for files the new deploy no longer has: a reload fixes it.
    if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(`${error.name} ${error.message}`)) {
      const k = "tembea-reloaded";
      try {
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          window.location.reload();
        }
      } catch {
        /* storage blocked */
      }
    }
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-bold">Something went wrong on this page</h1>
        <p className="mt-2 text-sm text-ink-muted">Your trip and bookings are saved. Try again, or go back to where you were.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="h-11 rounded-full bg-savanna-500 px-5 font-display text-sm font-semibold text-white">
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="h-11 rounded-full border border-ink/10 px-5 font-display text-sm font-semibold">
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
