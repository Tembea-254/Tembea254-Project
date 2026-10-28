"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Backpack,
  BedDouble,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Compass,
  Download,
  FileText,
  Footprints,
  Globe2,
  Headset,
  Heart,
  Languages,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Mountain,
  Orbit,
  Radio,
  Route,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  Umbrella,
  Users,
  Wallet,
  WifiOff,
  Wand2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { IMG } from "@/lib/data/images";
import { VR_DESTINATIONS } from "@/lib/data/vr";
import { LANGUAGES } from "@/lib/data/languages";
import { cn, unsplash } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";
import { Logo } from "../shell/logo";
import { Button, buttonVariants } from "../ui/button";
import { IconTile, Phone, Reveal, Swoosh, useTry } from "./kit";
import { MarketMock, PlannerMock, SafetyMock, SocialMock, TranslatorMock, VRMock } from "./mockups";

const SCENES = VR_DESTINATIONS.reduce((a, d) => a + d.scenes.length, 0);

export function Landing() {
  const params = useSearchParams();
  const { openLogin } = useLoginGate();

  // Middleware sends signed-out visitors here with ?callbackUrl=… — open the sign-in modal for them.
  useEffect(() => {
    const cb = params.get("callbackUrl");
    if (cb || params.get("error") || params.get("login")) {
      let path = "/dashboard";
      try {
        const u = new URL(cb || "/dashboard", window.location.origin);
        if (u.origin === window.location.origin) path = u.pathname + u.search;
      } catch {
        /* keep default */
      }
      openLogin({ callbackUrl: path, reason: params.get("error") ? "Sign-in didn't complete — try again" : undefined });
    }
  }, [params, openLogin]);

  return (
    <div className="overflow-x-clip bg-white">
      <Header />
      <Hero />
      <Trending />
      <Toolkit />
      <Showcase />
      <Numbers />
      <Travellers />
      <ClosingCTA />
      <Business />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ================================================================== */
/* Header                                                              */
/* ================================================================== */

const FEATURE_MENU = [
  {
    group: "Plan",
    items: [
      { icon: Wand2, label: "AI trip planner", href: "/planner" },
      { icon: Route, label: "Itinerary & map", href: "/planner" },
      { icon: Wallet, label: "Budget planner", href: "/planner" },
    ],
  },
  {
    group: "Experience",
    items: [
      { icon: Headset, label: "360° virtual previews", href: "/vr" },
      { icon: Languages, label: "Translator", href: "/translator" },
      { icon: Backpack, label: "Packing lists", href: "/planner" },
    ],
  },
  {
    group: "Stay safe & share",
    items: [
      { icon: ShieldCheck, label: "Safety band & SOS", href: "/safety" },
      { icon: Users, label: "Travel community", href: "/dashboard" },
      { icon: ShoppingBag, label: "Marketplace", href: "/marketplace" },
    ],
  },
];

function Header() {
  const { status } = useSession();
  const { openLogin } = useLoginGate();
  const tryIt = useTry();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-ink text-white">
      <div className="container-page flex h-[72px] items-center gap-8">
        <Link href="/" aria-label="Tembea254 home">
          <Logo light />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          <a href="#business" className="rounded-full px-4 py-2 font-display text-[15px] font-semibold text-white/85 hover:text-white">
            Business
          </a>
          <a href="#destinations" className="rounded-full px-4 py-2 font-display text-[15px] font-semibold text-white/85 hover:text-white">
            Destinations
          </a>
          <div className="relative" onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)}>
            <button className="flex items-center gap-1 rounded-full px-4 py-2 font-display text-[15px] font-semibold text-white/85 hover:text-white" onClick={() => setMenu((m) => !m)}>
              Features <ChevronDown className={cn("h-4 w-4 transition-transform", menu && "rotate-180")} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-1/2 top-full grid w-[640px] -translate-x-1/2 grid-cols-3 gap-6 rounded-3xl bg-white p-6 text-ink shadow-lift"
                >
                  {FEATURE_MENU.map((g) => (
                    <div key={g.group}>
                      <p className="eyebrow mb-3">{g.group}</p>
                      <ul className="space-y-1">
                        {g.items.map((it) => (
                          <li key={it.label}>
                            <button onClick={() => tryIt(it.href)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm font-medium hover:bg-sand-50">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-savanna-50 text-savanna-600">
                                <it.icon className="h-4 w-4" />
                              </span>
                              {it.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {status === "authenticated" ? (
            <Link href="/dashboard" className={buttonVariants({ size: "md" })}>
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <button onClick={() => openLogin({ reason: "Welcome back" })} className="hidden font-display text-[15px] font-semibold text-white/90 hover:text-white sm:block">
                Login
              </button>
              <Button size="md" onClick={() => openLogin()}>
                Join for free
              </Button>
            </>
          )}
          <span className="hidden items-center gap-1.5 font-display text-sm font-semibold text-white/80 md:flex">
            <Globe2 className="h-4 w-4" /> EN
          </span>
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink p-5 lg:hidden">
            <div className="flex items-center justify-between">
              <Logo light />
              <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setMobile(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 space-y-6">
              {FEATURE_MENU.map((g) => (
                <div key={g.group}>
                  <p className="mb-2 font-display text-xs font-semibold uppercase tracking-widest text-savanna-400">{g.group}</p>
                  {g.items.map((it) => (
                    <button
                      key={it.label}
                      onClick={() => {
                        setMobile(false);
                        tryIt(it.href);
                      }}
                      className="flex w-full items-center gap-3 py-2 text-left font-display text-lg font-semibold"
                    >
                      <it.icon className="h-5 w-5 text-white/60" /> {it.label}
                    </button>
                  ))}
                </div>
              ))}
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setMobile(false);
                  openLogin();
                }}
              >
                Join for free
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */

const POPULAR = ["Maasai Mara", "Diani", "Lamu", "Amboseli", "Nairobi", "Mombasa", "Naivasha", "Samburu"];

function Hero() {
  const tryIt = useTry();
  const [tab, setTab] = useState<"plan" | "explore">("plan");
  const [prompt, setPrompt] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const plan = (text = prompt) => {
    const q = text.trim() || "10 days: Maasai Mara safari then Diani beach";
    tryIt(`/planner?prompt=${encodeURIComponent(q)}`, "Create a free account to plan with AI");
  };

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#F3F8F5]">
      {/* Stippl-style sweeping photo shape */}
      <motion.div style={{ y: blobY }} className="pointer-events-none absolute -right-[18%] -top-[10%] hidden h-[125%] w-[72%] lg:block">
        <div className="h-full w-full overflow-hidden rounded-l-[48%] rounded-r-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(IMG.dianiPalms, 1600)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 rounded-l-[48%] bg-gradient-to-r from-[#F3F8F5] via-[#F3F8F5]/10 to-transparent" />
        </div>
      </motion.div>

      <div className="container-page relative grid min-h-[calc(100dvh-72px)] items-center gap-10 py-12 lg:grid-cols-[1fr_0.9fr] lg:py-16">
        <div className="relative z-10">
          <Reveal>
            <button onClick={() => tryIt("/dashboard")} className="inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 font-display text-sm font-semibold shadow-card">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-savanna-500 text-white">
                <Smartphone className="h-4 w-4" />
              </span>
              Get the app
            </button>
          </Reveal>
          <Reveal delay={0.05} className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {[IMG.maraLion, IMG.lamuDhow, IMG.dianiShore, IMG.amboseliKili, IMG.nairobiNight].map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={unsplash(p, 80, 80)} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{VR_DESTINATIONS.length} destinations</span> · {SCENES} immersive 360° spots
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-dusk-50 px-3 py-1.5 font-display text-xs font-semibold text-dusk-500">
              <Sparkles className="h-3.5 w-3.5" /> Meet your AI travel planner for Kenya
            </span>
          </Reveal>
          <Reveal delay={0.15}>
            <h1 className="mt-5 text-[44px] font-bold leading-[1.02] sm:text-6xl lg:text-[68px]">
              Where to next?
              <br />
              Let&apos;s <Swoosh>plan</Swoosh> it.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">
              Tembea254 is your AI travel planner for Kenya. Describe your dream trip and get a full day-by-day itinerary — route, stays, budget and packing — then walk every stop in 360° before you go.
            </p>
          </Reveal>

          <Reveal delay={0.25} className="mt-8 max-w-xl">
            <div className="rounded-[28px] bg-white p-2 shadow-lift">
              <div className="flex gap-1 p-1">
                {(["plan", "explore"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 font-display text-sm font-semibold capitalize transition-colors",
                      tab === t ? "bg-savanna-50 text-savanna-700" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {t === "plan" ? <Wand2 className="h-4 w-4" /> : <Compass className="h-4 w-4" />} {t}
                  </button>
                ))}
              </div>
              {tab === "plan" ? (
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    placeholder="Plan me a lovely route through the Maasai Mara and Diani…"
                    className="w-full resize-none rounded-[22px] bg-sand-50 p-4 pb-16 text-[15px] placeholder:text-ink-muted/70 focus:outline-none focus:ring-4 focus:ring-savanna-100"
                    onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && plan()}
                  />
                  <Button size="lg" className="absolute bottom-3 right-3 h-12 rounded-2xl px-6" onClick={() => plan()}>
                    Plan with AI
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-4">
                  {VR_DESTINATIONS.slice(0, 8).map((d) => (
                    <button key={d.slug} onClick={() => tryIt(`/vr/${d.slug}`, "Sign in to step into Kenya in 360°")} className="group relative h-24 overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={unsplash(d.cover, 300, 200)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <span className="absolute inset-0 bg-gradient-to-t from-night/80 to-transparent" />
                      <span className="absolute bottom-2 left-2 right-2 truncate text-left font-display text-xs font-semibold text-white">{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-ink-muted">Popular:</span>
              {POPULAR.map((p) => (
                <button key={p} onClick={() => plan(`A week in ${p}`)} className="font-semibold text-ink-soft underline-offset-4 hover:text-savanna-600 hover:underline">
                  {p}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* mobile: phone below the composer */}
        <Reveal className="flex justify-center pb-4 lg:hidden">
          <Phone tilt={2}>
            <PlannerMock />
          </Phone>
        </Reveal>

        {/* phone + floating tiles */}
        <motion.div style={{ y: phoneY }} className="relative mx-auto hidden h-[600px] w-[380px] lg:block">
          <motion.div initial={{ opacity: 0, y: 60, rotate: 6 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} className="absolute left-12 top-0">
            <Phone>
              <PlannerMock />
            </Phone>
          </motion.div>
          <IconTile className="-left-6 top-20 bg-ochre-50 text-ochre-600" delay={0.5}>
            <CalendarDays className="h-7 w-7" />
          </IconTile>
          <IconTile className="-left-10 top-[300px] bg-savanna-50 text-savanna-600" delay={0.7}>
            <BedDouble className="h-7 w-7" />
          </IconTile>
          <IconTile className="right-0 top-[420px] bg-maasai-50 text-maasai-500" delay={0.9}>
            <Orbit className="h-7 w-7" />
          </IconTile>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Trending                                                            */
/* ================================================================== */

const REGIONS = [
  { label: "Safari parks", icon: Sun },
  { label: "Swahili coast", icon: Umbrella },
  { label: "Rift Valley", icon: Mountain },
  { label: "Nairobi", icon: MapPin },
  { label: "Northern frontier", icon: Compass },
  { label: "Night walks", icon: Footprints },
];

function Trending() {
  const tryIt = useTry();
  return (
    <section id="destinations" className="container-page py-20 sm:py-28">
      <Reveal>
        <p className="eyebrow">Trending now</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl text-3xl font-bold sm:text-5xl">
            Don&apos;t just scroll. <span className="text-savanna-500">Pick your next adventure.</span>
          </h2>
          <button onClick={() => tryIt("/vr")} className="inline-flex items-center gap-1.5 font-display font-semibold text-savanna-600 hover:underline">
            Browse all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Reveal>
      <Reveal delay={0.05} className="scrollbar-none mt-8 flex gap-2 overflow-x-auto pb-1">
        {REGIONS.map((r) => (
          <button key={r.label} onClick={() => tryIt("/vr")} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2.5 font-display text-sm font-semibold hover:border-savanna-400">
            <r.icon className="h-4 w-4 text-savanna-600" /> {r.label}
          </button>
        ))}
      </Reveal>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {VR_DESTINATIONS.slice(0, 10).map((d, i) => (
          <Reveal key={d.slug} delay={(i % 5) * 0.06} y={40}>
            <button
              onClick={() => tryIt(`/vr/${d.slug}`, `Sign in to walk ${d.name} in 360°`)}
              className={cn("group relative block w-full overflow-hidden rounded-[26px] text-left", i % 5 === 1 || i % 5 === 3 ? "aspect-[3/4] lg:mt-8" : "aspect-[3/4]")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={unsplash(d.cover, 500, 680)} alt={d.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 font-display text-[10px] font-semibold text-ink">
                <Orbit className="h-3 w-3" /> 360°
              </span>
              <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                <span className="block font-display text-lg font-bold leading-tight">{d.name}</span>
                <span className="mt-0.5 block text-xs text-white/75">{d.tagline}</span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/* Toolkit (dark section)                                              */
/* ================================================================== */

const TOOLS = [
  { icon: MapIcon, title: "Route planning", text: "Map every stop and see drive, SGR and flight times between them.", tone: "text-savanna-600 bg-savanna-50" },
  { icon: CalendarDays, title: "Day-by-day plan", text: "Game drives, meals and transfers in one editable timeline.", tone: "text-ochre-600 bg-ochre-50" },
  { icon: Orbit, title: "360° previews", text: "Walk every destination before you book — day or night.", tone: "text-dusk-500 bg-dusk-50" },
  { icon: Wallet, title: "Budget tracker", text: "Park fees, stays and food estimated; split costs with your crew.", tone: "text-maasai-500 bg-maasai-50" },
  { icon: Backpack, title: "Packing list", text: "Safari layers, reef shoes and documents — built for your route.", tone: "text-savanna-600 bg-savanna-50" },
  { icon: Languages, title: "Translator", text: "Swahili, Kikuyu, Luo, Maa, Kalenjin and 12 world languages.", tone: "text-ochre-600 bg-ochre-50" },
  { icon: Radio, title: "Safety band", text: "A wearable with SOS, geofencing and live location for guides.", tone: "text-maasai-500 bg-maasai-50" },
  { icon: ShoppingBag, title: "Marketplace", text: "Book verified guides, lodges and experiences with M-Pesa.", tone: "text-dusk-500 bg-dusk-50" },
  { icon: Users, title: "Community", text: "Share trips, follow travellers and copy routes you love.", tone: "text-savanna-600 bg-savanna-50" },
  { icon: MessageCircle, title: "WhatsApp & PDF", text: "Send a photo-rich itinerary to anyone in one tap.", tone: "text-ochre-600 bg-ochre-50" },
  { icon: WifiOff, title: "Works offline", text: "Install it like an app; your trip goes where signal doesn't.", tone: "text-maasai-500 bg-maasai-50" },
  { icon: Sparkles, title: "AI planning", text: "Describe your trip; the planner builds the whole thing.", tone: "text-dusk-500 bg-dusk-50" },
];

function Toolkit() {
  const tryIt = useTry();
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
      <svg className="pointer-events-none absolute -right-40 top-0 h-full w-[900px] text-white/[0.04]" viewBox="0 0 900 900" aria-hidden>
        <path d="M900 0 C 500 120, 300 400, 520 900 L 900 900 Z" fill="currentColor" />
      </svg>
      <div className="container-page relative">
        <Reveal className="max-w-2xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-savanna-400">Everything in one app</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-5xl">
            Your AI travel planner.
            <br />
            Every tool you need.
          </h2>
          <p className="mt-4 text-white/70 sm:text-lg">One prompt gives you the itinerary. Budgets, packing, previews, translation and safety live right next to it.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => tryIt("/planner", "Create a free account to plan with AI")}>
              Start planning now <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="glass" onClick={() => tryIt("/dashboard")}>
              <Download className="h-5 w-5" /> Get the app
            </Button>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t, i) => (
            <Reveal key={t.title} delay={(i % 4) * 0.06}>
              <div className="h-full rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition-colors hover:bg-white/[0.1]">
                <span className={cn("grid h-12 w-12 place-items-center rounded-2xl shadow-card", t.tone)}>
                  <t.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{t.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Showcase — sticky scroll storytelling with live mockups             */
/* ================================================================== */

const STORIES = [
  {
    key: "planner",
    eyebrow: "AI trip planner",
    title: "From one sentence to a full Kenya itinerary",
    text: "Tell it who's going, for how long and what you love. Tembea picks the route, balances drive times, matches stays to your budget and lays out every day — then lets you drag, edit and re-plan anything.",
    points: ["Route on a live map", "Stays matched to budget", "Edit every day"],
    href: "/planner",
    cta: "Plan a trip",
    mock: <PlannerMock />,
    tone: "bg-savanna-50",
    icon: Wand2,
  },
  {
    key: "vr",
    eyebrow: "Virtual pre-visit",
    title: "Walk it before you book it",
    text: "Real 360° footage of the Mara, Lamu, Diani and Nairobi. Drag, scroll or tilt your phone to look around, walk from spot to spot, and flip to night mode to see the city after dark.",
    points: ["8K 360° scenes", "Day & night walks", "Phone-tilt viewing"],
    href: "/vr",
    cta: "Step into Kenya",
    mock: <VRMock />,
    tone: "bg-dusk-50",
    icon: Orbit,
  },
  {
    key: "translator",
    eyebrow: "Multilingual translator",
    title: "Speak like a local, from Shela to Kisumu",
    text: "Type or talk and hear the answer read back. Conversation mode lets you hand your phone across the counter; the phrasebook covers Kikuyu, Luo, Maa and Kalenjin greetings.",
    points: [`${LANGUAGES.length} languages`, "Voice in & out", "Conversation mode"],
    href: "/translator",
    cta: "Try the translator",
    mock: <TranslatorMock />,
    tone: "bg-ochre-50",
    icon: Languages,
  },
  {
    key: "safety",
    eyebrow: "Safety band (IoT)",
    title: "A wearable that watches your back",
    text: "Tembea Band pairs with the app for one-press SOS, geofence alerts around camps and parks, and live location your guide can see — even with weak signal.",
    points: ["One-press SOS", "Geofence alerts", "Guide live-tracking"],
    href: "/safety",
    cta: "See safety features",
    mock: <SafetyMock />,
    tone: "bg-maasai-50",
    icon: ShieldCheck,
  },
  {
    key: "social",
    eyebrow: "Travel community",
    title: "Share the trip, inspire the next one",
    text: "Post photos and 360° moments from every stop, follow travellers you trust and copy their routes into your own planner with one tap.",
    points: ["Stories & posts", "Copy any route", "Trip reels"],
    href: "/dashboard",
    cta: "Join the community",
    mock: <SocialMock />,
    tone: "bg-savanna-50",
    icon: Heart,
  },
  {
    key: "market",
    eyebrow: "Marketplace",
    title: "Book local, straight from your itinerary",
    text: "Verified guides, lodges, safari vans and artisans along your route — paid with M-Pesa or card and dropped into the right day automatically.",
    points: ["Verified locals", "M-Pesa checkout", "Auto-added to your days"],
    href: "/marketplace",
    cta: "Explore the marketplace",
    mock: <MarketMock />,
    tone: "bg-dusk-50",
    icon: ShoppingBag,
  },
];

function Showcase() {
  const tryIt = useTry();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-[#F3F8F5] py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">See it in action</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-5xl">Six ways Tembea makes Kenya easier</h2>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-20">
          <div>
            {STORIES.map((s, i) => (
              <div key={s.key} ref={(el) => void (refs.current[i] = el)} data-i={i} className="flex min-h-[70vh] items-center py-10 lg:min-h-[85vh]">
                <div className={cn("max-w-lg transition-opacity duration-500 lg:opacity-30", active === i && "lg:opacity-100")}>
                  <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-ink", s.tone)}>
                    <s.icon className="h-4 w-4" /> {s.eyebrow}
                  </span>
                  <h3 className="mt-4 text-3xl font-bold sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{s.text}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {s.points.map((p) => (
                      <li key={p} className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm font-medium">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-7" size="lg" onClick={() => tryIt(s.href)}>
                    {s.cta} <ArrowRight className="h-5 w-5" />
                  </Button>
                  {/* mobile: mockup inline */}
                  <div className="mt-10 flex justify-center lg:hidden">
                    <Phone>{s.mock}</Phone>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-290px)] flex h-[580px] items-center justify-center">
              <div className={cn("absolute h-[440px] w-[440px] rounded-full transition-colors duration-700", STORIES[active].tone)} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 40, rotate: 4 }}
                  animate={{ opacity: 1, y: 0, rotate: 2 }}
                  exit={{ opacity: 0, y: -40, rotate: -2 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <Phone>{STORIES[active].mock}</Phone>
                </motion.div>
              </AnimatePresence>
              <div className="absolute -right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
                {STORIES.map((s, i) => (
                  <span key={s.key} className={cn("h-2 w-2 rounded-full transition-all", active === i ? "h-6 bg-savanna-500" : "bg-ink/15")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Numbers                                                             */
/* ================================================================== */

function Numbers() {
  const tryIt = useTry();
  const cards = [
    { n: String(SCENES), label: "360° spots to explore", sub: "day & night walks", tone: "bg-savanna-50 text-savanna-700 -rotate-3" },
    { n: String(VR_DESTINATIONS.length), label: "destinations", sub: "safari, coast & city", tone: "bg-ochre-50 text-ochre-600 rotate-2 lg:mt-10" },
    { n: String(LANGUAGES.length), label: "languages", sub: "incl. 5 Kenyan", tone: "bg-maasai-50 text-maasai-600 rotate-1" },
    { n: "Free", label: "to start", sub: "no card needed", tone: "bg-dusk-50 text-dusk-500 -rotate-2 lg:mt-10" },
  ];
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow">Made in Nairobi</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
            Built for Kenya.
            <br />
            <span className="text-savanna-500">Ready for your trip.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Every route, park fee, drive time and phrase is tuned for Kenya — not a generic world planner with Kenya bolted on. Browse destinations and walk them in 360° for free, then plan when you&apos;re ready.
          </p>
          <Button className="mt-7" size="lg" variant="dark" onClick={() => tryIt("/vr")}>
            Start exploring <ArrowRight className="h-5 w-5" />
          </Button>
        </Reveal>
        <div className="grid grid-cols-2 gap-4">
          {cards.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08}>
              <div className={cn("rounded-[28px] p-6 shadow-card transition-transform hover:rotate-0", c.tone)}>
                <p className="font-display text-4xl font-bold sm:text-5xl">{c.n}</p>
                <p className="mt-2 font-display font-semibold text-ink">{c.label}</p>
                <p className="text-sm text-ink-muted">{c.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Travellers (marquee)                                                */
/* ================================================================== */

const PERSONAS = [
  { icon: Heart, title: "Honeymooners", text: "Balloon sunrise in the Mara, then slow days in Diani." },
  { icon: Users, title: "Families", text: "Short drives, baby elephants and pool afternoons." },
  { icon: Footprints, title: "Backpackers", text: "Budget camps, matatus and the SGR down to the coast." },
  { icon: Briefcase, title: "Business add-ons", text: "A free day in Nairobi turned into a park safari." },
  { icon: Mountain, title: "Adventurers", text: "Hell's Gate by bike and Mount Kenya's forest trails." },
  { icon: Globe2, title: "Diaspora returning home", text: "Show the family the Kenya you grew up with." },
  { icon: FileText, title: "Tour operators", text: "Branded itineraries and 360° previews that sell trips." },
];

function Travellers() {
  const row = [...PERSONAS, ...PERSONAS];
  return (
    <section className="overflow-hidden bg-[#F3F8F5] py-20">
      <Reveal className="container-page">
        <p className="eyebrow">For every kind of traveller</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">However you travel, Tembea plans around you</h2>
      </Reveal>
      <div className="relative mt-10">
        <motion.div className="flex w-max gap-4" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
          {row.map((p, i) => (
            <div key={i} className="w-[300px] shrink-0 rounded-3xl bg-white p-6 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-savanna-50 text-savanna-600">
                <p.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-lg font-bold">{p.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{p.text}</p>
            </div>
          ))}
        </motion.div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F3F8F5] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#F3F8F5] to-transparent" />
      </div>
    </section>
  );
}

/* ================================================================== */
/* CTAs, business, footer                                              */
/* ================================================================== */

function ClosingCTA() {
  const { openLogin } = useLoginGate();
  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[40px] bg-savanna-500 px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(IMG.maraSunset, 1600, 700)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-5xl">Your next trip starts here</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85 sm:text-lg">Plan it, preview it in 360° and share it — free.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="dark" onClick={() => openLogin()}>
                Start planning, it&apos;s free <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="glass" onClick={() => openLogin()}>
                <Smartphone className="h-5 w-5" /> Install on your phone
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Business() {
  const { openLogin } = useLoginGate();
  return (
    <section id="business" className="container-page pb-20 sm:pb-28">
      <div className="grid items-center gap-10 overflow-hidden rounded-[40px] bg-ink lg:grid-cols-2">
        <Reveal className="p-8 text-white sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-display text-xs font-semibold">
            <Briefcase className="h-4 w-4 text-ochre-400" /> Tembea for Business
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">For tour operators & agencies</h2>
          <p className="mt-4 text-white/70">
            Send clients branded itineraries with 360° previews of every lodge and park, collect deposits through M-Pesa and keep guides in sync on the road.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            {["White-label itineraries & PDFs", "Client portal with live updates", "360° previews that sell the trip", "Guide app with safety band alerts"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-savanna-400" /> {x}
              </li>
            ))}
          </ul>
          <Button className="mt-8" size="lg" onClick={() => openLogin({ reason: "Create your business account" })}>
            Learn more <ArrowRight className="h-5 w-5" />
          </Button>
        </Reveal>
        <div className="relative h-72 lg:h-full lg:min-h-[480px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(IMG.samburuElephants, 1200, 900)} alt="Safari vehicle with elephants in Samburu" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { openLogin } = useLoginGate();
  return (
    <section className="relative overflow-hidden bg-[#F3F8F5] py-20 sm:py-28">
      <div className="container-page text-center">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-5xl">
            Free forever. <Swoosh>Karibu</Swoosh>.
          </h2>
          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-3">
            {[
              { icon: Route, t: "Route planning" },
              { icon: Users, t: "Plan with friends" },
              { icon: Orbit, t: "Free 360° spots" },
              { icon: WifiOff, t: "Offline access" },
              { icon: MessageCircle, t: "WhatsApp sharing" },
            ].map((x) => (
              <li key={x.t} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-display text-sm font-semibold shadow-card">
                <x.icon className="h-4 w-4 text-savanna-600" /> {x.t}
              </li>
            ))}
          </ul>
          <Button className="mt-10" size="lg" onClick={() => openLogin()}>
            Join for free <ArrowRight className="h-5 w-5" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const tryIt = useTry();
  const cols = [
    { title: "Features", links: [["AI trip planner", "/planner"], ["360° previews", "/vr"], ["Translator", "/translator"], ["Safety band", "/safety"], ["Marketplace", "/marketplace"]] },
    { title: "Discover", links: VR_DESTINATIONS.slice(0, 6).map((d) => [d.name, `/vr/${d.slug}`]) },
    { title: "Company", links: [["About Tembea254", "/dashboard"], ["For business", "/dashboard"], ["Contact", "/dashboard"]] },
  ];
  return (
    <footer className="bg-ink pb-10 pt-16 text-white">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-white/60">Plan Kenya with AI, preview it in 360° and travel it safely. Tembea — let&apos;s go.</p>
          <div className="mt-5 flex gap-2">
            {[Globe2, MessageCircle, Smartphone].map((I, i) => (
              <span key={i} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                <I className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="font-display text-sm font-semibold">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              {c.links.map(([l, h]) => (
                <li key={l}>
                  <button onClick={() => tryIt(h)} className="hover:text-white">
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
        <p>© {new Date().getFullYear()} Tembea254 · Nairobi, Kenya</p>
        <p className="flex gap-4">
          <span>Terms & Conditions</span>
          <span>Privacy</span>
          <span>Cookie settings</span>
        </p>
      </div>
    </footer>
  );
}
