"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, MessageSquareQuote, PenLine, Quote, Star, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Review } from "@/lib/data/reviews";
import { VR_DESTINATIONS } from "@/lib/data/vr";
import { cn, unsplash } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";
import { Button } from "../ui/button";
import { Input, Textarea } from "../ui/primitives";
import { Reveal } from "./kit";

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [i, setI] = useState(0);
  const [writing, setWriting] = useState(false);
  const { status } = useSession();
  const { openLogin } = useLoginGate();

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d: { reviews: Review[] }) => setReviews(d.reviews))
      .catch(() => setReviews([]));
  }, []);

  useEffect(() => {
    if (!reviews || reviews.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % reviews.length), 7000);
    return () => clearInterval(t);
  }, [reviews]);

  const write = () => (status === "authenticated" ? setWriting(true) : openLogin({ reason: "Sign in to share your experience", callbackUrl: "/#reviews" }));
  const r = reviews?.[i];

  return (
    <section id="reviews" className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-savanna-100/60 blur-3xl" />
      <div className="container-page relative">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Testimonials</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-5xl">What clients say about us</h2>
          </div>
          <Button variant="outline" onClick={write}>
            <PenLine className="h-4 w-4" /> Share your experience
          </Button>
        </Reveal>

        {reviews === null ? (
          <div className="mt-10 grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-savanna-500" />
          </div>
        ) : !reviews.length || !r ? (
          <Reveal className="mt-10 rounded-[32px] border border-dashed border-ink/15 p-10 text-center">
            <MessageSquareQuote className="mx-auto h-10 w-10 text-savanna-500" />
            <p className="mt-4 font-display text-xl font-bold">Be the first to share your Tembea trip</p>
            <p className="mt-1 text-ink-muted">Your review helps other travellers plan with confidence.</p>
            <Button className="mt-6" onClick={write}>
              Write a review
            </Button>
          </Reveal>
        ) : (
          <Reveal className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="relative min-h-[340px] overflow-hidden rounded-[32px] bg-ink p-8 text-white sm:p-10">
              <Quote className="h-12 w-12 text-savanna-400/60" />
              <AnimatePresence mode="wait">
                <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }}>
                  <div className="mt-4 flex gap-1" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <Star key={k} className={cn("h-5 w-5", k < r.rating ? "fill-ochre-400 text-ochre-400" : "text-white/25")} />
                    ))}
                  </div>
                  <blockquote className="mt-5 font-display text-xl font-medium leading-relaxed text-white sm:text-2xl">“{r.text}”</blockquote>
                  <div className="mt-8 flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-savanna-500 font-display text-lg font-bold">{r.name[0]}</span>
                    <div>
                      <p className="font-display font-semibold">
                        {r.name}
                        {r.from && <span className="font-normal text-white/60"> · {r.from}</span>}
                        {r.sample && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">Sample</span>}
                      </p>
                      <p className="text-sm text-white/60">{r.trip}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-8 right-8 flex gap-2">
                <button onClick={() => setI((i - 1 + reviews.length) % reviews.length)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous review">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setI((i + 1) % reviews.length)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next review">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative min-h-[280px] overflow-hidden rounded-[32px]">
              <AnimatePresence initial={false}>
                <motion.img
                  key={r.placeImage}
                  src={unsplash(r.placeImage, 1000, 900)}
                  alt=""
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex gap-2">
                {reviews.map((x, j) => (
                  <button key={x.id} onClick={() => setI(j)} className={cn("h-1.5 rounded-full transition-all", j === i ? "w-10 bg-white" : "w-4 bg-white/40")} aria-label={`Show review ${j + 1}`} />
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
      <AnimatePresence>{writing && <ReviewForm onClose={() => setWriting(false)} />}</AnimatePresence>
    </section>
  );
}

function ReviewForm({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [trip, setTrip] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, text, trip, from, placeImage: VR_DESTINATIONS.find((d) => trip.toLowerCase().includes(d.name.split(" ")[0].toLowerCase()))?.cover }),
    });
    const d = (await res.json()) as { error?: string };
    setBusy(false);
    setMsg(res.ok ? { ok: true, t: "Asante! Your review will appear once our team has checked it." } : { ok: false, t: d.error || "Something went wrong." });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-night/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-lift sm:p-8" role="dialog" aria-modal="true" aria-label="Write a review">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Share your experience</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex gap-1" role="radiogroup" aria-label="Rating">
          {Array.from({ length: 5 }, (_, k) => (
            <button key={k} onClick={() => setRating(k + 1)} role="radio" aria-checked={rating === k + 1} aria-label={`${k + 1} stars`}>
              <Star className={cn("h-8 w-8 transition-colors", k < rating ? "fill-ochre-400 text-ochre-400" : "text-ink/20")} />
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Your trip, e.g. Diani weekend" value={trip} onChange={(e) => setTrip(e.target.value)} />
          <Input placeholder="Where you're from" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <Textarea className="mt-3" rows={5} placeholder="What did you love? What could be better?" value={text} onChange={(e) => setText(e.target.value)} />
        {msg && <p className={cn("mt-3 text-sm", msg.ok ? "text-savanna-700" : "text-maasai-600")}>{msg.t}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {msg?.ok ? "Close" : "Cancel"}
          </Button>
          {!msg?.ok && (
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit review
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
