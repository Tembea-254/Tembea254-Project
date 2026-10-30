"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FeedPost } from "@/lib/repo/community";
import { ago, Avatar, RichText } from "./shared";

type Comment = { id: string; author: string; authorImage?: string; handle?: string | null; text: string; createdAt: number };

/** TikTok-style comments drawer used over reels. */
export function CommentsSheet({ post, onClose, run }: { post: FeedPost | null; onClose: () => void; run: (b: Record<string, unknown>) => Promise<any> }) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const load = (id: string) =>
    fetch(`/api/community/comments?postId=${id}`)
      .then((r) => r.json())
      .then((d) => setItems(d.comments ?? []))
      .catch(() => setItems([]));
  useEffect(() => {
    setItems(null);
    if (post) load(post.id);
  }, [post]);
  return (
    <AnimatePresence>
      {post && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal aria-label="Comments">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }} onClick={(e) => e.stopPropagation()} className="flex max-h-[75dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-white">
            <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-3">
              <p className="font-display font-semibold">{post.commentCount} comments</p>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items === null && <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />}
              {items?.length === 0 && <p className="text-center text-sm text-ink-muted">Be the first to comment.</p>}
              {items?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author} image={c.authorImage} size={34} />
                  <div className="min-w-0 text-sm">
                    <p className="font-display text-xs font-semibold text-ink-muted">
                      {c.handle ? <Link href={`/community/u/${c.handle}`}>{c.author}</Link> : c.author} · {ago(c.createdAt)}
                    </p>
                    <RichText text={c.text} />
                  </div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-ink/[0.06] p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                const d = await run({ action: "comment", id: post.id, text: draft.trim() });
                if (d) {
                  setDraft("");
                  load(post.id);
                }
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" maxLength={500} aria-label="Write a comment" className="h-11 min-w-0 flex-1 rounded-full bg-sand-50 px-4 text-sm outline-none focus:ring-2 focus:ring-savanna-500" />
              <button type="submit" disabled={!draft.trim()} className="h-11 rounded-full bg-savanna-500 px-5 font-display text-sm font-semibold text-white disabled:opacity-40">
                Post
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
