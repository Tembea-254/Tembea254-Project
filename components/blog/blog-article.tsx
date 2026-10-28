"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Share2, Volume2 } from "lucide-react";
import { POSTS, getPost } from "@/lib/data/blog";
import { waLink } from "@/lib/site";
import { unsplash } from "@/lib/utils";
import { SOCIAL_ICONS, WhatsAppIcon } from "../brand/social-icons";
import { useTry } from "../landing/kit";
import { Footer, Header } from "../landing/site-chrome";
import { Button } from "../ui/button";
import { Meta } from "./blog-index";

export function BlogArticle({ slug }: { slug: string }) {
  const p = getPost(slug)!;
  const tryIt = useTry();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const more = POSTS.filter((x) => x.slug !== slug).slice(0, 3);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const listen = () => {
    const text = [p.title, ...p.sections.flatMap((s) => [s.heading ?? "", ...s.paragraphs, ...(s.tips ?? [])])].join(". ");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="bg-white">
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-savanna-500" />
      <Header />
      <main>
        <article>
          <header className="relative">
            <div className="relative h-[46vh] min-h-[320px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={unsplash(p.cover, 2000, 1100)} alt="" className="animate-kenburns h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/30 to-transparent" />
            </div>
            <div className="container-page relative -mt-48 max-w-3xl pb-6 text-white">
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> All stories
              </Link>
              <div className="mt-4">
                <Meta p={p} light />
              </div>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">{p.title}</h1>
            </div>
          </header>

          <div className="container-page max-w-3xl py-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-6">
              <p className="text-sm text-ink-muted">By {p.author}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={listen}>
                  <Volume2 className="h-4 w-4" /> Listen
                </Button>
                <a href={waLink(`${p.title} — ${url}`, "")} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white" aria-label="Share on WhatsApp">
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
                <a href={`https://x.com/intent/post?text=${encodeURIComponent(p.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white" aria-label="Share on X">
                  <SOCIAL_ICONS.twitter className="h-4 w-4" />
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] text-white" aria-label="Share on Facebook">
                  <SOCIAL_ICONS.facebook className="h-4 w-4" />
                </a>
                <button
                  onClick={() => (navigator.share ? navigator.share({ title: p.title, url }).catch(() => {}) : navigator.clipboard.writeText(url))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink/10"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-8 font-display text-xl font-medium leading-relaxed text-ink-soft">{p.excerpt}</p>
            {p.sections.map((s, i) => (
              <motion.section key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }} className="mt-8">
                {s.heading && <h2 className="text-2xl font-bold">{s.heading}</h2>}
                {s.paragraphs.map((t, j) => (
                  <p key={j} className="mt-4 text-[17px] leading-[1.8] text-ink/90">
                    {t}
                  </p>
                ))}
                {s.tips && (
                  <ul className="mt-5 space-y-2.5 rounded-3xl bg-[#F3F8F5] p-6">
                    {s.tips.map((t) => (
                      <li key={t} className="flex gap-3 text-[15px]">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-savanna-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            ))}

            {p.related && (
              <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink p-6 text-white sm:flex-row sm:items-center">
                <p className="font-display text-lg font-semibold">Ready to see it for yourself?</p>
                <Button onClick={() => tryIt(p.related!.href)}>
                  {p.related.label} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </article>

        <section className="bg-[#F3F8F5] py-14">
          <div className="container-page">
            <h2 className="text-2xl font-bold">Keep reading</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {more.map((m) => (
                <Link key={m.slug} href={`/blog/${m.slug}`} className="group overflow-hidden rounded-3xl bg-white shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unsplash(m.cover, 700, 420)} alt="" loading="lazy" className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="p-5">
                    <Meta p={m} />
                    <p className="mt-2 font-display font-bold leading-snug">{m.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
