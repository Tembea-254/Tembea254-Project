"use client";

import Link from "next/link";
import { CalendarClock, Radio, UserRound, Video } from "lucide-react";
import type { LiveWalk } from "@/lib/repo/live-types";
import { MODE_BY_ID, type TravelMode } from "@/lib/data/vr";
import { cn } from "@/lib/utils";
import { MODE_ICON } from "./mode-icons";

/** Live virtual walks hosted by local guides and creators. */
export function LiveWalks({ live }: { live: LiveWalk[] }) {
  return (
    <section className="mt-12 rounded-3xl bg-ink p-5 text-white sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-maasai-300">
            <Radio className="h-4 w-4" /> Live virtual walks
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Join a local guide, live</h2>
          <p className="mt-1 max-w-xl text-sm text-white/70">Young guides and creators stream walks, drives and boat rides across Kenya. Ask questions as you go.</p>
        </div>
        <Link href="/marketplace/join/creator" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-display text-sm font-semibold text-ink">
          <Video className="h-4 w-4" /> Host a live walk
        </Link>
      </div>
      {live.length ? (
        <ul className="mt-6 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
          {live.map((w) => {
            const isLive = w.status === "live";
            const Icon = MODE_ICON[(w.mode as TravelMode) in MODE_BY_ID ? (w.mode as TravelMode) : "walk"];
            return (
              <li key={w.id} className="flex flex-col rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 font-semibold", isLive ? "bg-maasai-500 text-white" : "bg-white/10 text-white/80")}>{isLive ? "LIVE NOW" : "Scheduled"}</span>
                  <span className="inline-flex items-center gap-1 text-white/70">
                    <Icon className="h-3.5 w-3.5" /> {w.destination}
                  </span>
                </div>
                <p className="mt-2 font-display font-semibold">{w.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/65">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {new Date(w.scheduledAt).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {w.durationMin} min
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/65">
                  <UserRound className="h-3.5 w-3.5" /> {w.host}
                </p>
                {w.streamUrl && (
                  <a href={w.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-savanna-500 font-display text-sm font-semibold">
                    {isLive ? "Watch live" : "Set a reminder"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl bg-white/[0.06] p-5 text-sm text-white/70">No live walks scheduled yet. Guides can propose one from the Creators page.</p>
      )}
    </section>
  );
}
