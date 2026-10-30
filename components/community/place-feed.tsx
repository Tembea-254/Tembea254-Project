"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";
import { Feed, PostGrid, useFlash } from "./hub";
import { useFeedActions } from "./post-card";

export function PlaceFeed({ placeId }: { placeId: string }) {
  const [view, setView] = useState<"grid" | "feed">("grid");
  const { data } = useSession();
  const { openLogin } = useLoginGate();
  const { flash, toast } = useFlash();
  const run = useFeedActions(!!data?.user, () => openLogin({ callbackUrl: `/community/place/${placeId}` }), flash);
  return (
    <section className="mt-6">
      <div className="mb-4 flex gap-1.5">
        {(["grid", "feed"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("h-9 rounded-full px-4 font-display text-sm font-semibold", view === v ? "bg-ink text-white" : "bg-white text-ink-soft shadow-card")}>
            {v === "grid" ? "Top photos & videos" : "All posts"}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-[620px] sm:max-w-none">{view === "grid" ? <PostGrid filter={`place:${placeId}`} /> : <div className="mx-auto max-w-[620px]"><Feed filter={`place:${placeId}`} run={run} flash={flash} /></div>}</div>
      {toast}
    </section>
  );
}
