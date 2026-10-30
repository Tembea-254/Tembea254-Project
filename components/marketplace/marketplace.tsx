"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarCheck,
  Camera,
  Car,
  Check,
  ClipboardList,
  Compass,
  Languages,
  Loader2,
  MapPin,
  Minus,
  Palette,
  Plus,
  Search,
  Smartphone,
  Store,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_BLURB, HIRE_CATEGORIES, HUBS, type HireCategory, type Provider, type RateUnit } from "@/lib/data/market";
import { cn, money, todayISO, unsplash } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input, Select, Textarea } from "../ui/primitives";

const CAT_ICON: Record<HireCategory, typeof Car> = {
  "Drivers & vehicles": Car,
  Photographers: Camera,
  "Local artists": Palette,
  "Tour & local guides": Compass,
};

const UNIT_LABEL: Record<RateUnit, [string, string]> = {
  "per day": ["day", "days"],
  "per half day": ["half day", "half days"],
  "per session": ["session", "sessions"],
  "per event": ["event", "events"],
  "per transfer": ["transfer", "transfers"],
};
const units = (u: RateUnit, n: number) => `${n} ${UNIT_LABEL[u][n === 1 ? 0 : 1]}`;

type Sort = "recommended" | "price" | "experience";

interface HireView {
  id: string;
  providerId: string;
  providerName: string;
  start: string;
  units: number;
  people: number;
  total: number;
  deposit: number;
  status: string;
  message?: string;
  createdAt: number;
}

export function Marketplace({ providers: PROVIDERS }: { providers: Provider[] }) {
  const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<string, Provider>;
  const [hub, setHub] = useState(HUBS[0].id);
  const [cat, setCat] = useState<HireCategory | "All">("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [hiring, setHiring] = useState<Provider | null>(null);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hires, setHires] = useState<HireView[]>([]);

  const loadHires = useCallback(() => {
    fetch("/api/hire")
      .then((r) => r.json())
      .then((d) => setHires(d.hires ?? []))
      .catch(() => {});
  }, []);
  useEffect(loadHires, [loadHires]);

  const hubData = HUBS.find((h) => h.id === hub)!;
  const inHub = PROVIDERS.filter((p) => p.hub === hub);
  const needle = q.trim().toLowerCase();
  const list = inHub
    .filter((p) => cat === "All" || p.category === cat)
    .filter((p) => !needle || [p.name, p.headline, p.offer, p.base, ...p.specialties, ...p.languages].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => (sort === "price" ? a.rate - b.rate : sort === "experience" ? b.years - a.years : HIRE_CATEGORIES.indexOf(a.category) - HIRE_CATEGORIES.indexOf(b.category)));

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[1.75rem] bg-ink text-white sm:rounded-[2rem]">
        <AnimatePresence mode="wait">
          <motion.img
            key={hubData.image}
            src={unsplash(hubData.image, 1600, 600)}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
        <div className="relative p-5 sm:p-10">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-savanna-300 sm:text-xs">Hire local · book ahead</p>
          <h1 className="mt-2 max-w-xl text-2xl font-bold leading-tight text-white sm:text-4xl">Hire trusted locals in {hubData.name}</h1>
          <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">Drivers and vehicles, photographers, artists, and tour guides. All checked by Tembea and booked before you arrive.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setBookingsOpen(true)} className="bg-white text-ink shadow-none hover:bg-sand-100">
              <ClipboardList className="h-4 w-4" /> My bookings{hires.length ? ` (${hires.length})` : ""}
            </Button>
            <Button variant="glass" onClick={() => setApplyOpen(true)}>
              <Store className="h-4 w-4" /> Become a provider
            </Button>
          </div>
        </div>
      </div>

      {/* Where */}
      <h2 className="mt-7 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">Where are you going?</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" role="tablist" aria-label="Regional hubs">
        {HUBS.map((h) => {
          const on = hub === h.id;
          return (
            <button
              key={h.id}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setHub(h.id);
                setCat("All");
              }}
              className={cn(
                "group relative h-24 overflow-hidden rounded-2xl text-left text-white transition-all sm:h-28",
                on ? "ring-4 ring-savanna-500 ring-offset-2" : "opacity-90 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={unsplash(h.image, 500, 300)} alt="" className="absolute inset-0 h-full w-full bg-ink object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
              <span className="absolute inset-x-3 bottom-2.5">
                <span className="block font-display text-sm font-bold leading-tight sm:text-base">{h.name}</span>
                <span className="block truncate text-[11px] text-white/75">{PROVIDERS.filter((p) => p.hub === h.id).length} providers · {h.region}</span>
              </span>
              {on && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-savanna-500">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" /> Covers {hubData.covers}
      </p>

      {/* What */}
      <h2 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider text-ink-muted">Who do you need?</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {HIRE_CATEGORIES.map((c) => {
          const Icon = CAT_ICON[c];
          const n = inHub.filter((p) => p.category === c).length;
          const on = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(on ? "All" : c)}
              aria-pressed={on}
              disabled={!n}
              className={cn(
                "flex min-h-[64px] items-start gap-3 rounded-2xl border p-3 text-left transition-all disabled:opacity-40 sm:p-4",
                on ? "border-savanna-500 bg-savanna-500 text-white shadow-glow" : "border-ink/10 bg-white hover:border-ink/25",
              )}
            >
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", on ? "bg-white/20" : "bg-savanna-50 text-savanna-600")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold leading-tight">{c}</span>
                <span className={cn("mt-0.5 hidden text-xs sm:block", on ? "text-white/80" : "text-ink-muted")}>{CATEGORY_BLURB[c]}</span>
                <span className={cn("mt-0.5 block text-xs", on ? "text-white/80" : "text-ink-muted")}>{n} available</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: Land Cruiser, wedding, German, birding…" className="pl-10" aria-label="Search providers" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="sm:w-56" aria-label="Sort">
          <option value="recommended">Recommended</option>
          <option value="price">Price: low to high</option>
          <option value="experience">Most experienced</option>
        </Select>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sand-100 px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" />
        <span>
          <strong>Verified</strong> means Tembea has checked the provider&apos;s ID and the licences their work needs (driving and PSV, guide certificate, vehicle insurance). Profiles marked <strong>Demo</strong> are
          examples while we sign up real providers in each area.
        </span>
      </p>

      {/* Results */}
      <div className="mt-5 flex items-baseline justify-between">
        <p className="font-display text-base font-bold">
          {list.length} {cat === "All" ? "providers" : cat.toLowerCase()} in {hubData.short}
        </p>
        {(cat !== "All" || q) && (
          <button
            onClick={() => {
              setCat("All");
              setQ("");
            }}
            className="text-sm font-semibold text-savanna-600"
          >
            Clear filters
          </button>
        )}
      </div>
      <div key={`${hub}-${cat}`} className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
        {list.map((p, i) => (
          <ProviderCard key={p.id} p={p} i={i} onHire={() => setHiring(p)} />
        ))}
      </div>
      {!list.length && <p className="mt-3 rounded-3xl border border-dashed border-ink/15 p-8 text-center text-ink-muted">No matches here. Try another category or area.</p>}

      <AnimatePresence>{hiring && <HireSheet p={hiring} onClose={() => setHiring(null)} onBooked={loadHires} />}</AnimatePresence>
      <AnimatePresence>{bookingsOpen && <Bookings hires={hires} byId={PROVIDER_BY_ID} onClose={() => setBookingsOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{applyOpen && <ProviderApply onClose={() => setApplyOpen(false)} defaultHub={hub} />}</AnimatePresence>
    </div>
  );
}

function ProviderCard({ p, i, onHire }: { p: Provider; i: number; onHire: () => void }) {
  const Icon = CAT_ICON[p.category];
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35 }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-lift"
    >
      <button onClick={onHire} className="relative h-40 overflow-hidden bg-sand-100 text-left" aria-label={`View ${p.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={unsplash(p.image, 640, 360)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-display text-[11px] font-semibold">
          <Icon className="h-3.5 w-3.5" /> {p.category}
        </span>
        {p.demo && <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 font-display text-[11px] font-semibold text-white">Demo</span>}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-bold leading-snug">{p.name.replace(" (demo)", "")}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1 font-medium text-savanna-700">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {p.base}
          </span>
          <span>{p.years} yrs</span>
        </p>
        <p className="mt-2 text-sm font-medium text-ink">{p.headline}</p>
        <p className="mt-1 text-sm text-ink-soft">{p.offer}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <Languages className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.languages.join(", ")}</span>
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="min-w-0">
            <span className="font-display text-lg font-bold">{money(p.rate)}</span>
            <span className="block text-xs text-ink-muted">{p.unit}</span>
          </p>
          <Button size="sm" onClick={onHire} className="shrink-0">
            <CalendarCheck className="h-4 w-4" /> Hire
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function Overlay({ children, onClose, side, label }: { children: React.ReactNode; onClose: () => void; side?: boolean; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-[60] flex bg-ink/50 backdrop-blur-sm", side ? "justify-end" : "items-end justify-center sm:items-center sm:p-4")} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={side ? { x: "100%" } : { y: 60, opacity: 0 }}
        animate={side ? { x: 0 } : { y: 0, opacity: 1 }}
        exit={side ? { x: "100%" } : { y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={cn("relative flex flex-col overflow-hidden bg-white shadow-lift", side ? "h-full w-full max-w-md" : "max-h-[92dvh] w-full max-w-xl rounded-t-[1.75rem] sm:max-h-[90dvh] sm:rounded-[2rem]")}
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Stepper({ value, onChange, min = 1, max = 30, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink/10 px-2 py-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid h-9 w-9 place-items-center rounded-full bg-sand-100 disabled:opacity-40" aria-label={`Fewer ${label}`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="font-display text-sm font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid h-9 w-9 place-items-center rounded-full bg-sand-100 disabled:opacity-40" aria-label={`More ${label}`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function HireSheet({ p, onClose, onBooked }: { p: Provider; onClose: () => void; onBooked: () => void }) {
  const [start, setStart] = useState("");
  const [n, setN] = useState(1);
  const [people, setPeople] = useState(2);
  const [pickup, setPickup] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<false | "request" | "deposit">(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<HireView | null>(null);
  const total = p.rate * n;
  const deposit = Math.ceil((total * 0.3) / 100) * 100;
  const Icon = CAT_ICON[p.category];
  const valid = !!start && phone.replace(/\D/g, "").length >= 9;

  // poll a real M-Pesa deposit until Safaricom's callback lands
  useEffect(() => {
    if (done?.status !== "deposit-pending") return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/hire?id=${done.id}`).then((r) => r.json()).catch(() => null);
      if (d?.hire && d.hire.status !== "deposit-pending") setDone(d.hire);
    }, 4000);
    return () => clearInterval(t);
  }, [done]);

  const submit = async (payDeposit: boolean) => {
    setError(null);
    setBusy(payDeposit ? "deposit" : "request");
    const r = await fetch("/api/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: p.id, start, units: n, people, pickup, note, phone, payDeposit }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(d.error || "Something went wrong");
    setDone(d.hire);
    onBooked();
  };

  if (done) {
    const ok = done.status !== "deposit-failed";
    return (
      <Overlay onClose={onClose} label="Booking sent">
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className={cn("grid h-16 w-16 place-items-center rounded-full text-white", ok ? "bg-savanna-500" : "bg-maasai-500")}>
            {done.status === "deposit-pending" ? <Loader2 className="h-7 w-7 animate-spin" /> : ok ? <Check className="h-7 w-7" /> : <X className="h-7 w-7" />}
          </span>
          <h3 className="mt-4 text-xl font-bold">
            {done.status === "deposit-pending" ? "Check your phone" : done.status === "deposit-paid" ? "Deposit paid — you're booked" : done.status === "deposit-failed" ? "Deposit didn't go through" : done.status === "demo-deposit" ? "Booked (demo deposit)" : "Request sent"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            {done.status === "deposit-pending" ? `Enter your M-Pesa PIN to pay the ${money(done.deposit)} deposit.` : done.message}
          </p>
          <p className="mt-4 rounded-2xl bg-sand-100 px-4 py-3 text-sm">
            {p.name.replace(" (demo)", "")} · {new Date(done.start).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} · {units(p.unit, done.units)} · {money(done.total)}
          </p>
          <Button className="mt-6" onClick={onClose}>
            Done
          </Button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} label={`Hire ${p.name}`}>
      <div className="overflow-y-auto overscroll-contain">
        <div className="relative h-44 bg-sand-100 sm:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(p.image, 900, 500)} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          <div className="absolute inset-x-5 bottom-4 text-white">
            <p className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 font-display text-[11px] font-semibold backdrop-blur">
              <Icon className="h-3.5 w-3.5" /> {p.category}
            </p>
            <h2 className="mt-1.5 text-xl font-bold leading-tight text-white sm:text-2xl">{p.name.replace(" (demo)", "")}</h2>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="font-medium">{p.headline}</p>
            <p className="mt-1 text-sm text-ink-soft">{p.about}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.specialties.map((t) => (
                <span key={t} className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-2 rounded-2xl border border-ink/10 p-4 text-sm sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> {p.offer}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> Based in {p.base} · {p.years} years
            </p>
            <p className="flex items-start gap-2">
              <Languages className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> {p.languages.join(", ")}
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-savanna-600" /> {p.checks.join(" · ")}
            </p>
            <p className="text-xs text-ink-muted sm:col-span-2">{p.terms}</p>
            {p.demo && <p className="rounded-xl bg-ochre-50 px-3 py-2 text-xs text-ochre-600 sm:col-span-2">Demo profile for previewing the marketplace. Requests are saved, but no real provider receives them yet.</p>}
          </div>

          {/* Booking form */}
          <div>
            <h3 className="font-display text-base font-bold">Book in advance</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Start date
                <Input type="date" min={todayISO()} value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
              </label>
              <div className="text-sm font-medium">
                How many {UNIT_LABEL[p.unit][1]}
                <div className="mt-1">
                  <Stepper value={n} onChange={setN} label={UNIT_LABEL[p.unit][1]} />
                </div>
              </div>
              <div className="text-sm font-medium">
                People
                <div className="mt-1">
                  <Stepper value={people} onChange={setPeople} max={60} label="people" />
                </div>
              </div>
              <label className="text-sm font-medium">
                {p.category === "Drivers & vehicles" ? "Pick-up point" : "Where to meet"}
                <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder={p.category === "Drivers & vehicles" ? "e.g. Voi SGR station, 10:00" : "e.g. our camp near Talek"} className="mt-1" />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Anything they should know?
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ages of kids, special requests, flight number…" className="mt-1" />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Your M-Pesa / WhatsApp number
                <div className="relative mt-1">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" inputMode="tel" className="pl-9" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky summary */}
      <div className="border-t border-ink/5 bg-white p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {money(p.rate)} × {units(p.unit, n)}
            <span className="ml-1 hidden sm:inline">
              <Users className="mb-0.5 inline h-3.5 w-3.5" /> {people}
            </span>
          </p>
          <p className="font-display text-xl font-bold">{money(total)}</p>
        </div>
        {error && <p className="mt-2 text-sm text-maasai-500">{error}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" disabled={!valid || !!busy} onClick={() => submit(false)}>
            {busy === "request" && <Loader2 className="h-4 w-4 animate-spin" />} Send request
          </Button>
          <Button className="bg-[#00A651] shadow-none hover:bg-[#008f45]" disabled={!valid || !!busy} onClick={() => submit(true)}>
            {busy === "deposit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Pay {money(deposit)} deposit
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-muted">{valid ? "Deposit is 30%; the rest is paid to the provider on the day." : "Pick a date and add your number to continue."}</p>
      </div>
    </Overlay>
  );
}

const STATUS: Record<string, [string, string]> = {
  requested: ["Requested", "bg-sand-100 text-ink-soft"],
  "deposit-pending": ["Awaiting M-Pesa", "bg-ochre-50 text-ochre-600"],
  "deposit-paid": ["Deposit paid", "bg-savanna-50 text-savanna-700"],
  "deposit-failed": ["Deposit failed", "bg-maasai-50 text-maasai-600"],
  "demo-deposit": ["Demo deposit", "bg-dusk-50 text-dusk-500"],
};

function Bookings({ hires, onClose, byId: PROVIDER_BY_ID }: { hires: HireView[]; onClose: () => void; byId: Record<string, Provider> }) {
  return (
    <Overlay onClose={onClose} side label="My bookings">
      <div className="border-b border-ink/5 p-5 pr-16">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ClipboardList className="h-5 w-5" /> My bookings
        </h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {!hires.length && <p className="py-12 text-center text-ink-muted">No bookings yet. Hire someone and they&apos;ll show here.</p>}
        {hires.map((h) => {
          const p = PROVIDER_BY_ID[h.providerId];
          const [label, tone] = STATUS[h.status] ?? [h.status, "bg-sand-100"];
          return (
            <div key={h.id} className="flex gap-3 rounded-2xl border border-ink/5 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p && <img src={unsplash(p.image, 160, 160)} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-sand-100 object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{h.providerName.replace(" (demo)", "")}</p>
                <p className="text-xs text-ink-muted">
                  {new Date(h.start).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })} · {p ? units(p.unit, h.units) : h.units} · {h.people} people
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>{label}</span>
                  <span className="font-display text-sm font-bold">{money(h.total)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}

function ProviderApply({ onClose, defaultHub }: { onClose: () => void; defaultHub: string }) {
  const [f, setF] = useState({ business: "", phone: "", hub: defaultHub, category: HIRE_CATEGORIES[0] as string, about: "" });
  const [state, setState] = useState<"form" | "busy" | "sent">("form");
  const [error, setError] = useState<string | null>(null);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const hint = useMemo(
    () =>
      ({
        "Drivers & vehicles": "Vehicle make, seats, 4x4 or pop-up roof, PSV licence…",
        Photographers: "What you shoot, your kit, portfolio link…",
        "Local artists": "Dance, music, painting or craft; group size; past events…",
        "Tour & local guides": "Where you guide, languages, KPSGA/KWS certificate level…",
      })[f.category] ?? "",
    [f.category],
  );

  return (
    <Overlay onClose={onClose} label="Become a provider">
      <div className="overflow-y-auto p-6">
        {state === "sent" ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-savanna-500 text-white">
              <Check className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Application received</h2>
            <p className="mt-2 text-sm text-ink-muted">Our team will call you to check your ID and licences before your profile goes live.</p>
            <Button className="mt-6" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setState("busy");
              setError(null);
              const r = await fetch("/api/vendors/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
              const d = await r.json().catch(() => ({}));
              if (r.ok) setState("sent");
              else {
                setError(d.error || "Could not send");
                setState("form");
              }
            }}
          >
            <h2 className="flex items-center gap-2 pr-10 text-xl font-bold">
              <Store className="h-5 w-5" /> Become a provider
            </h2>
            <p className="text-sm text-ink-muted">Drivers, photographers, artists, and guides: get hired by travellers before they arrive.</p>
            <Input placeholder="Your name or business" value={f.business} onChange={up("business")} required />
            <Input placeholder="Phone (M-Pesa / WhatsApp)" inputMode="tel" value={f.phone} onChange={up("phone")} required />
            <div className="grid grid-cols-2 gap-2">
              <Select value={f.hub} onChange={up("hub")} aria-label="Area">
                {HUBS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value="other">Other area</option>
              </Select>
              <Select value={f.category} onChange={up("category")} aria-label="What you offer">
                {HIRE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <Textarea placeholder={hint} rows={4} value={f.about} onChange={up("about")} required />
            {error && <p className="text-sm text-maasai-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={state === "busy"}>
              {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Send application
            </Button>
          </form>
        )}
      </div>
    </Overlay>
  );
}
