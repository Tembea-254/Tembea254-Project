import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { BadgeCheck, BarChart3, Check, Eye, Megaphone, MousePointerClick, Route, ShieldCheck, Sparkles, Star } from "lucide-react";
import { partnerEnquiry } from "./actions";
import { Submit } from "@/components/admin/client";
import { Footer, Header } from "@/components/landing/site-chrome";
import { getDb, schema as s } from "@/lib/db";
import { IMG } from "@/lib/data/images";
import { VR_DESTINATIONS } from "@/lib/data/vr";
import { unsplash } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Advertise with Tembea254 — reach travellers while they plan Kenya",
  description: "List your safaris, lodges and transfers in Tembea254's AI trip planner. Travellers compare and book you at the moment they decide.",
};
export const dynamic = "force-dynamic";

const input = "h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500";

const WAYS = [
  { icon: Route, title: "Inside every matching itinerary", text: "When a traveller plans a trip that visits your destinations, the planner shows your packages next to their day-by-day plan, priced for their group." },
  { icon: BarChart3, title: "Compared fairly, side by side", text: "Like comparing ride prices before you book a cab: price per person, what's included, rating and how much of the trip you cover. The best match wins, so good offers win." },
  { icon: Megaphone, title: "Sponsored placement and ads", text: "Pin your packages to the top of comparisons or run sponsored cards across the app. Always labelled, so travellers trust what they see." },
  { icon: MousePointerClick, title: "Measurable from day one", text: "See how many travellers saw you, clicked through to your booking page and what it cost per click. Pay commission only on referred bookings." },
];

const PLANS = [
  { name: "Listed", price: "Free", unit: "", points: ["Packages compared in the AI planner", "Booking link to your own site or WhatsApp", "Commission only on bookings we send you"], cta: "List my packages" },
  { name: "Featured", price: "KES 15,000", unit: "/ month", points: ["Everything in Listed", "Pinned first in comparisons, marked Sponsored", "Monthly report: views, clicks, bookings"], cta: "Get featured", highlight: true },
  { name: "Ads", price: "From KES 5,000", unit: "/ week", points: ["Sponsored cards in the planner, 360° pre-visits and community", "Target by destination", "Pay per week, pause any time"], cta: "Run an ad" },
];

export default async function PartnersPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let stats = { trips: 0, users: 0 };
  try {
    const db = await getDb();
    const [t, u] = await Promise.all([db.select({ n: sql<number>`count(*)::int` }).from(s.trips), db.select({ n: sql<number>`count(*)::int` }).from(s.users)]);
    stats = { trips: t[0].n, users: u[0].n };
  } catch {
    /* the page still works without numbers */
  }

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-night text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(IMG.maraMigration, 1800, 900)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/30" />
          <div className="container-page relative grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-savanna-300">For tour operators, lodges and car hire</p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.05] text-white sm:text-6xl">Be the safari travellers pick while they plan.</h1>
              <p className="mt-5 max-w-xl text-lg text-white/75">Tembea254&apos;s AI planner builds a traveller&apos;s whole Kenya trip, then shows them who can run it. List your packages and get compared, chosen and booked at the moment people decide.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#join" className="inline-flex h-12 items-center rounded-full bg-savanna-500 px-6 font-display font-semibold">
                  Talk to us about listing
                </a>
                <a href="#how" className="inline-flex h-12 items-center rounded-full bg-white/10 px-6 font-display font-semibold backdrop-blur">
                  How it works
                </a>
              </div>
              {(stats.trips > 0 || stats.users > 0) && (
                <dl className="mt-10 flex flex-wrap gap-8">
                  {stats.trips > 0 && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-white/50">Trips planned</dt>
                      <dd className="font-display text-3xl font-bold">{stats.trips.toLocaleString()}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-white/50">Travellers signed up</dt>
                    <dd className="font-display text-3xl font-bold">{stats.users.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-white/50">Destinations in 360°</dt>
                    <dd className="font-display text-3xl font-bold">{VR_DESTINATIONS.length}</dd>
                  </div>
                </dl>
              )}
            </div>

            {/* What a listing looks like inside the planner */}
            <div className="rounded-[2rem] bg-white p-4 text-ink shadow-lift">
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">How you appear in a traveller&apos;s plan</p>
              {[
                { name: "Your company", title: "4-day Mara & Naivasha private safari", price: "KES 144,000", sub: "for 2 · KES 72,000 pp", tag: "Sponsored", best: "Best match", rating: "4.7" },
                { name: "Another operator", title: "3-day Maasai Mara group safari", price: "KES 76,000", sub: "for 2 · KES 38,000 pp", tag: "", best: "Lowest price", rating: "4.4" },
              ].map((c) => (
                <div key={c.title} className="mb-3 rounded-3xl border border-ink/10 p-4 last:mb-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.tag && <span className="rounded-full bg-ochre-400 px-2 py-0.5 font-display text-[10px] font-bold">{c.tag}</span>}
                    <span className="rounded-full bg-savanna-50 px-2 py-0.5 font-display text-[10px] font-bold text-savanna-700">{c.best}</span>
                  </div>
                  <p className="mt-2 font-display font-bold">{c.title}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-muted">
                    {c.name} · <Star className="h-3 w-3 fill-ochre-400 text-ochre-400" /> {c.rating}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <span>
                      <span className="block font-display text-lg font-bold">{c.price}</span>
                      <span className="text-xs text-ink-muted">{c.sub}</span>
                    </span>
                    <span className="rounded-full bg-ink px-4 py-2 font-display text-xs font-semibold text-white">View package</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="container-page py-16 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">Your packages, in front of travellers at the right moment</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {WAYS.map((w) => (
              <div key={w.title} className="rounded-3xl bg-white p-6 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-savanna-50 text-savanna-700">
                  <w.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{w.title}</h3>
                <p className="mt-1 text-ink-soft">{w.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 rounded-3xl bg-sand-50 p-6 sm:grid-cols-3">
            {[
              { icon: Eye, t: "Travellers see you after a 360° pre-visit", d: "They've already walked the Mara in VR. They're ready to book." },
              { icon: ShieldCheck, t: "Honest labels build trust", d: "Sponsored is always marked, and prices are your real prices." },
              { icon: BadgeCheck, t: "Young Kenyans film your camps", d: "Tembea Scouts record 360° tours of partner lodges for the app." },
            ].map((x) => (
              <div key={x.t} className="flex gap-3">
                <x.icon className="mt-0.5 h-5 w-5 shrink-0 text-savanna-600" />
                <span>
                  <span className="block font-display font-semibold">{x.t}</span>
                  <span className="text-sm text-ink-muted">{x.d}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container-page">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple plans</h2>
            <p className="mt-2 text-ink-muted">Launch pricing for founding partners. Start free and upgrade when you see the clicks.</p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.name} className={`flex flex-col rounded-3xl p-6 ${p.highlight ? "bg-ink text-white shadow-lift" : "bg-sand-50"}`}>
                  {p.highlight && (
                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-ochre-400 px-2.5 py-1 font-display text-xs font-bold text-ink">
                      <Sparkles className="h-3.5 w-3.5" /> Most popular
                    </span>
                  )}
                  <h3 className={`text-xl font-bold ${p.highlight ? "text-white" : ""}`}>{p.name}</h3>
                  <p className="mt-2">
                    <span className="font-display text-3xl font-bold">{p.price}</span>
                    <span className={p.highlight ? "text-white/60" : "text-ink-muted"}> {p.unit}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {p.points.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.highlight ? "text-savanna-300" : "text-savanna-600"}`} /> {x}
                      </li>
                    ))}
                  </ul>
                  <a href="#join" className={`mt-6 inline-flex h-11 items-center justify-center rounded-full font-display text-sm font-semibold ${p.highlight ? "bg-savanna-500 text-white" : "bg-ink text-white"}`}>
                    {p.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="join" className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold">Become a founding partner</h2>
            <p className="mt-2 text-ink-muted">Tell us about your business. We&apos;ll set up your listing with you, free.</p>
            {(searchParams.ok || searchParams.error) && (
              <p role="status" className={`mt-5 rounded-2xl p-4 text-sm ${searchParams.error ? "bg-maasai-50 text-maasai-700" : "bg-savanna-50 text-savanna-700"}`}>
                {searchParams.error || searchParams.ok}
              </p>
            )}
            <form action={partnerEnquiry} className="mt-6 grid gap-4 rounded-3xl bg-white p-6 shadow-card sm:grid-cols-2">
              <input name="website_confirm" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Business name</span>
                <input name="company" required className={input} placeholder="e.g. Bonfire Adventures" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Your name</span>
                <input name="name" className={input} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Type of business</span>
                <select name="kind" className={input} defaultValue="operator">
                  <option value="operator">Tour operator / travel agency</option>
                  <option value="stay">Hotel, lodge or camp</option>
                  <option value="transport">Car hire / transfers</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Email</span>
                <input name="email" type="email" className={input} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Phone / WhatsApp</span>
                <input name="phone" inputMode="tel" className={input} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Website</span>
                <input name="website" className={input} placeholder="https://" />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium">Interested in</legend>
                <div className="flex flex-wrap gap-2">
                  {["Free listing", "Featured placement", "Ads", "360° tour of my property"].map((x) => (
                    <label key={x} className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-sm">
                      <input type="checkbox" name="interest" value={x} className="accent-savanna-600" /> {x}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Anything else?</span>
                <textarea name="message" rows={3} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-savanna-500" placeholder="Your best-selling packages, destinations, group sizes…" />
              </label>
              <div className="sm:col-span-2">
                <Submit className="h-12 px-8">Send</Submit>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
