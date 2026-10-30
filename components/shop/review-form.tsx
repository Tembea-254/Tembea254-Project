"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Submit } from "@/components/admin/client";
import { cn } from "@/lib/utils";

export function ReviewForm({ action, orderId, itemId, title }: { action: (f: FormData) => Promise<void>; orderId: string; itemId: string; title: string }) {
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-full bg-ochre-50 px-3 text-xs font-semibold text-ochre-700">
        <Star className="h-3.5 w-3.5" /> Rate & review
      </button>
    );
  return (
    <form action={action} className="mt-2 rounded-2xl bg-sand-50 p-3">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="item" value={itemId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-xs font-semibold">How was {title}?</p>
      <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}>
            <Star className={cn("h-7 w-7 transition-transform hover:scale-110", n <= rating ? "fill-ochre-400 text-ochre-400" : "text-ink/20")} />
          </button>
        ))}
      </div>
      <textarea name="text" rows={2} maxLength={800} placeholder="What did you like? (20+ characters earns reward tokens)" className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-savanna-500" />
      <div className="mt-2 flex gap-2">
        {rating > 0 && <Submit small>Post review</Submit>}
        <button type="button" onClick={() => setOpen(false)} className="h-8 px-2 text-xs text-ink-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
