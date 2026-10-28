"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  BedDouble,
  Bus,
  Car,
  Compass,
  Camera,
  Hand,
  Heart,
  Languages,
  MapPin,
  MessageCircle,
  Mic,
  Moon,
  Navigation,
  Orbit,
  Plane,
  Radio,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
  Ticket,
  UtensilsCrossed,
  Volume2,
  Wallet,
} from "lucide-react";
import { IMG } from "@/lib/data/images";
import { cn, unsplash } from "@/lib/utils";

const img = (id: string, w = 600, h?: number) => unsplash(id, w, h);

/* ---------------- AI planner ---------------- */
export function PlannerMock() {
  const stops = [
    { n: "Nairobi", nights: 2, img: IMG.nairobiSkyline },
    { n: "Maasai Mara", nights: 3, img: IMG.maraMigration },
    { n: "Diani Beach", nights: 4, img: IMG.dianiPalms },
  ];
  return (
    <div className="flex h-full flex-col bg-sand-50">
      <div className="relative h-40 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(IMG.maraBalloon, 600, 320)} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 to-transparent" />
        <p className="absolute bottom-3 left-4 font-display text-[15px] font-bold text-white">10-day Bush & Beach</p>
      </div>
      <div className="flex gap-1 px-3 pt-3 text-[10px] font-semibold">
        {["Route", "Days", "Budget", "Packing"].map((t, i) => (
          <span key={t} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-savanna-500 text-white" : "bg-white text-ink-muted")}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex-1 space-y-1 px-3 pt-3">
        {stops.map((s, i) => (
          <div key={s.n}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="flex items-center gap-2.5 rounded-2xl bg-white p-2 shadow-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(s.img, 120, 120)} alt="" className="h-11 w-11 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="text-[12px] font-semibold">{s.n}</p>
                <p className="text-[10px] text-ink-muted">{s.nights} nights</p>
              </div>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-savanna-500 text-[10px] font-bold text-white">{i + 1}</span>
            </motion.div>
            {i < stops.length - 1 && (
              <div className="flex items-center gap-1.5 py-1 pl-6 text-[9px] font-semibold text-maasai-500">
                {i === 0 ? <Bus className="h-3 w-3" /> : <Plane className="h-3 w-3" />} {i === 0 ? "5h 6m · Safari van" : "1h 50m · Flight"}
              </div>
            )}
          </div>
        ))}
        <div className="mt-2 rounded-2xl bg-white p-3 shadow-card">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-ink-muted">Budget used</span>
            <span className="font-semibold">KES 412,000</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-sand-200">
            <motion.div initial={{ width: 0 }} whileInView={{ width: "68%" }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.5 }} className="h-full rounded-full bg-savanna-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 360 virtual preview ---------------- */
export function VRMock() {
  return (
    <div className="relative h-full overflow-hidden bg-night">
      <motion.div
        className="absolute inset-y-0 left-0 w-[300%]"
        animate={{ x: ["0%", "-55%", "0%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(IMG.maraMigration, 1600, 540)} alt="" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,21,18,0.8)_100%)]" />
      <div className="absolute left-3 right-3 top-8 flex items-center justify-between text-white">
        <div>
          <p className="text-[9px] text-white/70">Narok County</p>
          <p className="font-display text-sm font-bold">Maasai Mara</p>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 backdrop-blur">
          <Volume2 className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-night/50 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
        <Hand className="h-3.5 w-3.5" /> Drag to look around
      </div>
      <div className="absolute inset-x-3 bottom-4 text-white">
        <div className="flex gap-1.5 text-[9px]">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
            <Orbit className="h-2.5 w-2.5" /> 360°
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
            <Moon className="h-2.5 w-2.5" /> Night mode
          </span>
        </div>
        <p className="mt-1 font-display text-[13px] font-semibold">Game drive across the plains</p>
        <div className="mt-2 flex gap-1.5">
          {[IMG.maraMigration, IMG.maraLion, IMG.maasaiWomen, IMG.maraBalloon].map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={img(p, 80, 80)} alt="" className={cn("h-8 w-8 rounded-full border-2 object-cover", i === 0 ? "border-savanna-400" : "border-white/20")} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Translator ---------------- */
export function TranslatorMock() {
  const msgs = [
    { me: true, t: "Erokamano ahinya", o: "Thank you very much" },
    { me: false, t: "You're welcome! Where are you headed?", o: "Karibu! Unaenda wapi?" },
    { me: true, t: "Hii ni bei gani?", o: "How much is this?" },
  ];
  return (
    <div className="flex h-full flex-col bg-white px-3 pt-9">
      <div className="flex items-center justify-between rounded-2xl bg-sand-50 p-2 text-[11px] font-semibold">
        <span className="rounded-xl bg-white px-2.5 py-1.5 shadow-card">English</span>
        <Languages className="h-4 w-4 text-savanna-500" />
        <span className="rounded-xl bg-white px-2.5 py-1.5 shadow-card">Kiswahili</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {["Gĩkũyũ", "Dholuo", "Maa", "Kalenjin"].map((l) => (
          <span key={l} className="rounded-full border border-ink/10 px-2 py-0.5 text-[9px]">
            {l}
          </span>
        ))}
      </div>
      <div className="mt-3 flex-1 space-y-2">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.35 }} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2", m.me ? "rounded-br-md bg-savanna-500 text-white" : "rounded-bl-md bg-sand-100")}>
              <p className="text-[12px] font-semibold leading-snug">{m.t}</p>
              <p className={cn("text-[9px]", m.me ? "text-white/75" : "text-ink-muted")}>{m.o}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mb-5 flex items-center justify-center gap-6">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-savanna-500 text-white shadow-glow">
          <Mic className="h-5 w-5" />
        </span>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ochre-400 text-ink">
          <Mic className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- Safety IoT band ---------------- */
export function SafetyMock() {
  return (
    <div className="relative h-full bg-[#eef3ef]">
      {/* map */}
      <svg viewBox="0 0 270 540" className="absolute inset-0 h-full w-full">
        <path d="M-10 120 C 80 100, 140 200, 280 160" stroke="#d7e3da" strokeWidth="18" fill="none" />
        <path d="M60 -10 C 90 150, 40 320, 120 560" stroke="#d7e3da" strokeWidth="14" fill="none" />
        <circle cx="140" cy="250" r="90" fill="#14A85F" fillOpacity="0.08" stroke="#14A85F" strokeDasharray="5 6" />
        <path d="M70 330 C 110 300, 120 270, 140 250" stroke="#C8102E" strokeWidth="3" strokeDasharray="5 6" fill="none" />
      </svg>
      <motion.span className="absolute left-[128px] top-[238px] h-6 w-6 rounded-full bg-savanna-500 ring-4 ring-white" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
      <div className="absolute left-3 right-3 top-9 flex items-center justify-between rounded-2xl bg-white p-2.5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-savanna-50 text-savanna-600">
            <Radio className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold">Tembea Band</p>
            <p className="text-[9px] text-ink-muted">Connected · 86% battery</p>
          </div>
        </div>
        <ShieldCheck className="h-5 w-5 text-savanna-500" />
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 }} className="absolute left-3 right-3 top-[300px] rounded-2xl bg-white p-3 shadow-lift">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-ochre-600">
          <Navigation className="h-3 w-3" /> Geofence alert
        </p>
        <p className="mt-1 text-[11px]">You&apos;re leaving the camp perimeter after dark. Your guide has been notified.</p>
      </motion.div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
        <motion.span className="absolute inset-0 rounded-full bg-maasai-500/40" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-maasai-500 text-white shadow-lift">
          <Siren className="h-7 w-7" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- Social feed ---------------- */
export function SocialMock() {
  const posts = [
    { who: "Wanjiru K.", where: "Lamu Old Town", img: IMG.lamuDhow, likes: 248 },
    { who: "Tom & Ana", where: "Amboseli", img: IMG.amboseliKili, likes: 512 },
  ];
  return (
    <div className="h-full overflow-hidden bg-white pt-8">
      <div className="flex gap-2 overflow-hidden px-3 pb-2">
        {[IMG.maraLion, IMG.dianiShore, IMG.nairobiNight, IMG.samburuPeople, IMG.watamuBay].map((s) => (
          <span key={s} className="rounded-full bg-gradient-to-tr from-ochre-400 via-maasai-500 to-savanna-500 p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(s, 80, 80)} alt="" className="h-11 w-11 rounded-full border-2 border-white object-cover" />
          </span>
        ))}
      </div>
      {posts.map((p, i) => (
        <motion.div key={p.who} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.3 }} className="border-t border-ink/[0.06] pb-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-savanna-100 text-[10px] font-bold text-savanna-700">{p.who[0]}</span>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold">
                {p.who} <BadgeCheck className="h-3 w-3 text-savanna-500" />
              </p>
              <p className="flex items-center gap-0.5 text-[9px] text-ink-muted">
                <MapPin className="h-2.5 w-2.5" /> {p.where}
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(p.img, 540, 360)} alt="" className="h-40 w-full object-cover" />
          <div className="flex items-center gap-3 px-3 pt-2 text-ink">
            <Heart className="h-4 w-4 fill-maasai-500 text-maasai-500" />
            <MessageCircle className="h-4 w-4" />
            <Send className="h-4 w-4" />
            <span className="ml-auto text-[10px] font-semibold">{p.likes} likes</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Marketplace ---------------- */
export function MarketMock() {
  const items = [
    { t: "Land Cruiser + driver", p: "KES 22,000 / day", icon: Car, img: IMG.maraLion, r: "Maasai Mara" },
    { t: "Beach photographer", p: "KES 15,000 / session", icon: Camera, img: IMG.dianiSunset, r: "Diani" },
    { t: "Red elephant guide", p: "KES 9,000 / day", icon: Compass, img: IMG.tsavoElephants, r: "Tsavo" },
  ];

  return (
    <div className="flex h-full flex-col bg-sand-50 px-3 pt-9">
      <p className="font-display text-sm font-bold">Hire local, book ahead</p>
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <motion.div key={it.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.15 }} className="flex gap-2.5 rounded-2xl bg-white p-2 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(it.img, 140, 140)} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[11px] font-semibold">
                <it.icon className="h-3 w-3 text-savanna-600" /> {it.t}
              </p>
              <p className="flex items-center gap-0.5 text-[9px] text-ink-muted">
                <BadgeCheck className="h-2.5 w-2.5 text-savanna-600" /> {it.r} · Verified
              </p>
              <p className="mt-0.5 text-[11px] font-bold">{it.p}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-auto mb-5 rounded-2xl bg-ink p-3 text-white">
        <p className="flex items-center gap-1.5 text-[10px] text-white/70">
          <Wallet className="h-3 w-3" /> 30% deposit with M-Pesa
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold">KES 6,600</span>
          <span className="rounded-full bg-savanna-500 px-3 py-1 text-[10px] font-semibold">Hire</span>
        </div>
      </div>
    </div>
  );
}

export function CameraBadge() {
  return <Camera className="h-6 w-6" />;
}

export function SparkBadge() {
  return <Sparkles className="h-6 w-6" />;
}
