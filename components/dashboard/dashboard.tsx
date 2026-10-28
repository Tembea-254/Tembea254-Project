"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Headset,
  Languages,
  MapPinned,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { PLACE_BY_ID } from "@/lib/data/places";
import { VR_DESTINATIONS } from "@/lib/data/vr";
import { useActivity, useMounted, useProfile, useStats, useTrips, type ActivityEvent } from "@/lib/hooks/store";
import { cn, fmtDate, money, todayISO, unsplash } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { Badge, Card, Progress, SectionTitle } from "../ui/primitives";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Habari ya asubuhi" : h < 17 ? "Habari ya mchana" : "Habari ya jioni";
}

export function Dashboard() {
  const mounted = useMounted();
  const [profile] = useProfile();
  const { data: session } = useSession();
  const { trips } = useTrips();
  const { stats } = useStats();
  const { events } = useActivity();

  const today = todayISO();
  const upcoming = useMemo(
    () => [...trips].filter((t) => (t.days[t.days.length - 1]?.date ?? t.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0],
    [trips, today],
  );
  const daysPlanned = trips.reduce((a, t) => a + t.days.length, 0);

  const statCards = [
    { label: "Trips planned", value: trips.length, sub: `${daysPlanned} days of adventures`, icon: Route, tone: "bg-savanna-50 text-savanna-600", href: "/planner" },
    { label: "Virtual previews", value: stats.vrViews, sub: `${stats.vrMinutes} min explored`, icon: Headset, tone: "bg-dusk-50 text-dusk-500", href: "/vr" },
    { label: "Phrases translated", value: stats.translations, sub: "Swahili & local languages", icon: Languages, tone: "bg-ochre-50 text-ochre-600", href: "/translator" },
    { label: "Destinations", value: VR_DESTINATIONS.length, sub: "ready to preview", icon: MapPinned, tone: "bg-maasai-50 text-maasai-500", href: "/vr" },
  ];

  return (
    <div className="container-page py-8 sm:py-10">
      {/* Welcome */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Sun className="h-4 w-4 text-ochre-500" /> {mounted ? fmtDate(today, { weekday: "long", day: "numeric", month: "long" }) : " "}
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {greeting()}, {(session?.user?.name || (mounted ? profile.name : "Traveller")).split(" ")[0]}
          </h1>
          <p className="mt-1 text-ink-soft">Where in Kenya are we going next?</p>
        </div>
        <Link href="/planner" className={buttonVariants({ size: "lg" })}>
          <Sparkles className="h-5 w-5" /> Plan a new trip
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={s.href}>
              <Card className="h-full p-4 transition-shadow hover:shadow-lift sm:p-5">
                <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", s.tone)}>
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-display text-3xl font-bold">{mounted ? s.value : "–"}</p>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-ink-muted">{mounted ? s.sub : ""}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Next trip / empty state */}
        {mounted && upcoming ? <NextTrip tripId={upcoming.id} /> : <EmptyTrip />}

        {/* Quick actions */}
        <div className="grid gap-4">
          <QuickAction
            href="/vr/maasai-mara"
            title="Walk the Maasai Mara"
            text="Live game-drive footage with ambient sound."
            icon={Play}
            image={unsplash(VR_DESTINATIONS[0].cover, 600, 300)}
          />
          <QuickAction href="/translator" title="Learn 5 Swahili phrases" text="Jambo, asante, pole pole — and how to say them." icon={Languages} tone="bg-ochre-400 text-ink" />
          <QuickAction href="/safety" title="Safety & alerts" text="Emergency numbers and travel advisories (coming soon)." icon={ShieldCheck} tone="bg-ink text-white" />
        </div>
      </div>

      {/* Featured VR */}
      <section className="mt-12">
        <SectionTitle
          eyebrow="Pre-visit before you book"
          title="Featured virtual experiences"
          action={
            <Link href="/vr" className="inline-flex items-center gap-1 font-display text-sm font-semibold text-savanna-600">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {VR_DESTINATIONS.slice(0, 6).map((d) => (
            <Link key={d.slug} href={`/vr/${d.slug}`} className="group relative h-64 w-56 shrink-0 snap-start overflow-hidden rounded-3xl sm:w-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={unsplash(d.cover, 600, 760)} alt={d.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent" />
              <Badge tone="glass" className="absolute left-3 top-3">
                {d.type}
              </Badge>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="font-display text-lg font-bold">{d.name}</p>
                <p className="line-clamp-1 text-xs text-white/75">{d.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity */}
      <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Recent activity</h2>
          {mounted && events.length ? (
            <ul className="mt-4 space-y-1">
              {events.slice(0, 7).map((e) => (
                <ActivityRow key={e.id} e={e} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-muted">
              Nothing yet. Plan a trip or step into a virtual walk and it&apos;ll show up here.
            </p>
          )}
        </Card>
        <Card className="overflow-hidden">
          <div className="relative h-full min-h-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unsplash(PLACE_BY_ID["lamu"].image, 900, 600)} alt="Lamu dhow" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/60 to-transparent" />
            <div className="relative max-w-xs p-6 text-white">
              <Badge tone="ochre">Did you know?</Badge>
              <p className="mt-3 font-display text-xl font-bold text-white">Lamu Old Town has almost no cars.</p>
              <p className="mt-2 text-sm text-white/75">Donkeys and dhows are still the main way to get around this 700-year-old Swahili town.</p>
              <Link href="/vr/lamu" className={cn(buttonVariants({ variant: "glass", size: "sm" }), "mt-4")}>
                <Play className="h-4 w-4" /> Walk Lamu now
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function NextTrip({ tripId }: { tripId: string }) {
  const { trips } = useTrips();
  const [profile] = useProfile();
  const trip = trips.find((t) => t.id === tripId)!;
  const start = trip.days[0]?.date ?? trip.startDate;
  const daysAway = Math.max(0, Math.round((new Date(start + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime()) / 86400000));
  const packed = trip.packing.filter((p) => p.packed).length;
  const total = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48 sm:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trip.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-night/85 to-transparent" />
        <Badge tone="glass" className="absolute left-4 top-4">
          <CalendarClock className="h-3.5 w-3.5" /> {daysAway === 0 ? "Starts today!" : `In ${daysAway} days`}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-xs text-white/70">Your next trip</p>
          <h2 className="text-2xl font-bold text-white">{trip.title}</h2>
          <p className="text-sm text-white/80">{trip.stops.map((s) => PLACE_BY_ID[s.placeId].name).join(" → ")}</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-muted">Dates</p>
          <p className="font-display text-sm font-semibold">
            {fmtDate(start, { day: "numeric", month: "short" })} – {fmtDate(trip.days[trip.days.length - 1].date, { day: "numeric", month: "short" })}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Estimated cost</p>
          <p className="font-display text-sm font-semibold">{money(total, profile.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">
            Packing {packed}/{trip.packing.length}
          </p>
          <Progress className="mt-2" value={(packed / Math.max(1, trip.packing.length)) * 100} />
        </div>
      </div>
      <div className="flex gap-2 px-5 pb-5">
        <Link href={`/planner/${trip.id}`} className={buttonVariants({ size: "md" })}>
          Open itinerary <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function EmptyTrip() {
  return (
    <Card className="relative overflow-hidden p-6 sm:p-8">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-savanna-100 blur-2xl" />
      <div className="relative max-w-md">
        <Badge tone="violet">
          <Sparkles className="h-3.5 w-3.5" /> AI trip planner
        </Badge>
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Describe your trip. Get a full Kenya itinerary.</h2>
        <p className="mt-2 text-ink-soft">Route, stays, game drives, budget and packing list — ready to edit in under a minute.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/planner" className={buttonVariants({ size: "lg" })}>
            Start planning <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  text,
  icon: Icon,
  image,
  tone = "bg-savanna-500 text-white",
}: {
  href: string;
  title: string;
  text: string;
  icon: typeof Play;
  image?: string;
  tone?: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="flex items-center gap-4 overflow-hidden p-3 transition-shadow hover:shadow-lift">
        {image ? (
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-night/30">
              <Icon className="h-6 w-6 fill-white text-white" />
            </span>
          </div>
        ) : (
          <span className={cn("grid h-20 w-24 shrink-0 place-items-center rounded-2xl", tone)}>
            <Icon className="h-7 w-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{title}</p>
          <p className="text-sm text-ink-muted">{text}</p>
        </div>
        <ArrowRight className="mr-2 h-5 w-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1" />
      </Card>
    </Link>
  );
}

function ActivityRow({ e }: { e: ActivityEvent }) {
  const Icon = e.kind === "trip" ? Route : e.kind === "vr" ? Headset : e.kind === "translate" ? Languages : Clock;
  const tone = e.kind === "trip" ? "bg-savanna-50 text-savanna-600" : e.kind === "vr" ? "bg-dusk-50 text-dusk-500" : "bg-ochre-50 text-ochre-600";
  const ago = timeAgo(e.at);
  const content = (
    <span className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand-50">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{e.text}</span>
      <span className="shrink-0 text-xs text-ink-muted">{ago}</span>
    </span>
  );
  return <li>{e.href ? <Link href={e.href}>{content}</Link> : content}</li>;
}

function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
