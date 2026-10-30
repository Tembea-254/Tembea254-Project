"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import type { BlogPost } from "@/lib/data/blog";
import { cn, fmtDate, unsplash } from "@/lib/utils";
import { Reveal } from "../landing/kit";
import { Footer, Header } from "../landing/site-chrome";
import { Chip } from "../ui/primitives";

const CATS = ["All", "Safari", "Coast", "City", "Culture", "Guides"] as const;

export function BlogIndex({ posts: POSTS }: { posts: BlogPost[] }) {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const list = useMemo(() => POSTS.filter((p) => cat === "All" || p.category === cat), [cat, POSTS]);
  const [featured, ...rest] = list;
  return (
    <div className="bg-white">
      <Header />
      <main>
        <section className="bg-[#F3F8F5] py-14 sm:py-20">
          <div className="container-page">
            <Reveal>
              <p className="eyebrow">The Tembea254 blog</p>
              <h1 className="mt-2 max-w-2xl text-4xl font-bold sm:text-6xl">Stories & guides for travelling Kenya</h1>
              <p className="mt-4 max-w-xl text-lg text-ink-soft">Practical, local advice — when to go, how to get around and what not to miss.</p>
            </Reveal>
            <div className="scrollbar-none mt-8 flex gap-2 overflow-x-auto pb-1">
              {CATS.map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        </section>

        <section className="container-page py-12 sm:py-16">
          {featured && (
            <Reveal>
              <Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-[32px] bg-ink text-white lg:grid-cols-[1.3fr_1fr]">
                <div className="relative h-72 overflow-hidden lg:h-[440px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unsplash(featured.cover, 1400, 900)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-10">
                  <Meta p={featured} light />
                  <h2 className="mt-3 text-2xl font-bold text-white sm:text-4xl">{featured.title}</h2>
                  <p className="mt-3 text-white/70">{featured.excerpt}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-display font-semibold text-savanna-400">
                    Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          )}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p, i) => (
              <motion.div key={p.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}>
                <Link href={`/blog/${p.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-lift">
                  <div className="relative h-52 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={unsplash(p.cover, 800, 520)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <Meta p={p} />
                    <h3 className="mt-2 text-lg font-bold leading-snug">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.excerpt}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function Meta({ p, light }: { p: BlogPost; light?: boolean }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-2 text-xs", light ? "text-white/60" : "text-ink-muted")}>
      <span className={cn("rounded-full px-2.5 py-1 font-display font-semibold", light ? "bg-white/10 text-white" : "bg-savanna-50 text-savanna-700")}>{p.category}</span>
      {fmtDate(p.date, { day: "numeric", month: "short", year: "numeric" })}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> {p.readMins} min read
      </span>
    </p>
  );
}
