"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Backpack,
  CalendarDays,
  Check,
  Copy,
  Download,
  FileDown,
  Loader2,
  MessageCircle,
  FileJson,
  Map as MapIcon,
  MapPin,
  NotebookPen,
  Printer,
  Route,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PLACE_BY_ID } from "@/lib/data/places";
import { useMounted, useProfile, useTrips } from "@/lib/hooks/store";
import type { Trip } from "@/lib/planner/types";
import { cn, fmtDate, money } from "@/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Badge, Card, Textarea } from "../ui/primitives";
import { BudgetTab } from "./budget-tab";
import { DaysTab } from "./days-tab";
import { downloadICS, downloadJSON, tripAsText } from "./export";
import { buildItineraryPDF, pdfFileName, whatsappText } from "./pdf";
import { PackingTab } from "./packing-tab";
import { RouteTab } from "./route-tab";

const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type TabId = "route" | "days" | "budget" | "packing" | "notes";
const TABS: { id: TabId; label: string; icon: typeof Route }[] = [
  { id: "route", label: "Route", icon: Route },
  { id: "days", label: "Days", icon: CalendarDays },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "packing", label: "Packing", icon: Backpack },
  { id: "notes", label: "Notes", icon: NotebookPen },
];

export function TripView({ id }: { id: string }) {
  const mounted = useMounted();
  const router = useRouter();
  const { trips, saveTrip, deleteTrip } = useTrips();
  const [profile] = useProfile();
  const trip = trips.find((t) => t.id === id);
  const [tab, setTab] = useState<TabId>("days");
  const [activePlace, setActivePlace] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapOpenMobile, setMapOpenMobile] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!mounted) return <div className="container-page py-10"><div className="skeleton h-64 w-full" /></div>;
  if (!trip)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Trip not found</h1>
        <p className="mt-2 text-ink-muted">It may have been deleted, or it was planned on another device.</p>
        <Link href="/planner" className={cn(buttonVariants(), "mt-6")}>
          Plan a new trip
        </Link>
      </div>
    );

  const update = (patch: Partial<Trip> | ((t: Trip) => Trip)) => saveTrip(typeof patch === "function" ? patch(trip) : { ...trip, ...patch });
  const total = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const nights = trip.stops.reduce((a, s) => a + s.nights, 0);
  const startDate = trip.days[0]?.date ?? trip.startDate;
  const endDate = trip.days[trip.days.length - 1]?.date ?? trip.startDate;

  async function share() {
    const text = tripAsText(trip!);
    try {
      if (navigator.share) {
        await navigator.share({ title: trip!.title, text });
        return;
      }
    } catch {
      /* user cancelled */
    }
    await navigator.clipboard.writeText(text);
    setToast("Itinerary copied — paste it into WhatsApp or email");
  }

  async function makePDF() {
    setBusy(true);
    try {
      const blob = await buildItineraryPDF(trip!, profile.currency);
      return new File([blob], pdfFileName(trip!), { type: "application/pdf" });
    } finally {
      setBusy(false);
    }
  }

  async function downloadPDF() {
    const file = await makePDF();
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setToast("PDF itinerary downloaded");
  }

  /** Phones: share the PDF straight into WhatsApp via the share sheet. Desktop: download the PDF and open WhatsApp with a summary. */
  async function shareWhatsApp() {
    const file = await makePDF();
    const text = whatsappText(trip!);
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: trip!.title, text });
        return;
      }
    } catch {
      return; // user cancelled the share sheet
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setToast("PDF saved — attach it in the WhatsApp chat that just opened");
  }

  return (
    <div className="print-full">
      {/* Header */}
      <section className="relative overflow-hidden bg-night text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trip.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/20" />
        <div className="container-page relative pb-8 pt-6">
          <div className="no-print flex items-center justify-between">
            <Link href="/planner" className={buttonVariants({ variant: "glass", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> All trips
            </Link>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#25D366] text-white shadow-none hover:bg-[#1ebe5a]" onClick={shareWhatsApp} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button variant="glass" size="sm" onClick={share} className="hidden sm:inline-flex">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <div className="relative">
                <Button variant="glass" size="sm" onClick={() => setExportOpen((o) => !o)}>
                  <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
                </Button>
                <AnimatePresence>
                  {exportOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl bg-white p-1.5 text-ink shadow-lift"
                      onMouseLeave={() => setExportOpen(false)}
                    >
                      {[
                        { icon: FileDown, label: "Download PDF (with photos)", run: downloadPDF },
                        { icon: MessageCircle, label: "Send PDF on WhatsApp", run: shareWhatsApp },
                        { icon: Printer, label: "Print this page", run: () => window.print() },
                        { icon: CalendarDays, label: "Add to calendar (.ics)", run: () => downloadICS(trip) },
                        { icon: Copy, label: "Copy as text", run: async () => { await navigator.clipboard.writeText(tripAsText(trip)); setToast("Copied to clipboard"); } },
                        { icon: FileJson, label: "Download data (.json)", run: () => downloadJSON(trip) },
                      ].map((o) => (
                        <button
                          key={o.label}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sand-50"
                          onClick={() => {
                            setExportOpen(false);
                            o.run();
                          }}
                        >
                          <o.icon className="h-4 w-4 text-ink-muted" /> {o.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button
                variant="glass"
                size="icon-sm"
                aria-label="Delete trip"
                onClick={() => {
                  if (window.confirm("Delete this trip? This can't be undone.")) {
                    deleteTrip(trip.id);
                    router.push("/planner");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-10 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge tone="glass">
                <MapPin className="h-3 w-3" /> Kenya
              </Badge>
              {trip.source === "ai" && (
                <Badge tone="glass">
                  <Sparkles className="h-3 w-3" /> AI drafted
                </Badge>
              )}
              <Badge tone="glass" className="capitalize">
                {trip.style === "relaxed" ? "Slow pace" : trip.style === "packed" ? "Packed pace" : "Balanced pace"}
              </Badge>
            </div>
            <textarea
              value={trip.title}
              rows={1}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }
              }}
              onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
              aria-label="Trip title"
              className="mt-3 w-full resize-none overflow-hidden bg-transparent font-display text-3xl font-bold leading-tight tracking-tight text-white outline-none placeholder:text-white/50 focus:underline focus:decoration-savanna-400 focus:decoration-2 focus:underline-offset-8 sm:text-[2.75rem]"
            />
            <p className="mt-2 text-white/75">{trip.stops.map((s) => PLACE_BY_ID[s.placeId].name).join(" · ")}</p>
          </div>

          <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={CalendarDays} label="Dates" value={`${fmtDate(startDate, { day: "numeric", month: "short" })} – ${fmtDate(endDate, { day: "numeric", month: "short" })}`} />
            <Stat icon={MapIcon} label="Stops" value={`${trip.stops.length} · ${nights} nights`} />
            <Stat icon={Users} label="Travellers" value={`${trip.travelers} · ${trip.group}`} />
            <Stat icon={Wallet} label="Est. total" value={money(total, profile.currency)} />
          </dl>
        </div>
      </section>

      {/* Tabs */}
      <div className="no-print sticky top-[57px] z-20 border-b border-ink/[0.06] bg-white/90 backdrop-blur-xl lg:top-0">
        <div className="container-page scrollbar-none flex gap-1 overflow-x-auto py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
                tab === t.id ? "text-savanna-700" : "text-ink-muted hover:text-ink",
              )}
            >
              {tab === t.id && <motion.span layoutId="trip-tab" className="absolute inset-0 rounded-full bg-savanna-50" />}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
          <button onClick={() => setMapOpenMobile((o) => !o)} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold text-ink-muted lg:hidden">
            <MapIcon className="h-4 w-4" /> {mapOpenMobile ? "Hide map" : "Map"}
          </button>
        </div>
      </div>

      <div className="container-page grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="min-w-0">
          {mapOpenMobile && (
            <div className="mb-6 h-72 overflow-hidden rounded-3xl shadow-card lg:hidden">
              <RouteMap stops={trip.stops} activePlaceId={activePlace} />
            </div>
          )}
          {tab === "route" && <RouteTab trip={trip} onChange={(t) => { saveTrip(t); setToast("Route updated — days re-planned to match"); }} onFocusPlace={setActivePlace} currency={profile.currency} />}
          {tab === "days" && <DaysTab trip={trip} onChange={saveTrip} onFocusPlace={setActivePlace} currency={profile.currency} />}
          {tab === "budget" && <BudgetTab trip={trip} onChange={saveTrip} currency={profile.currency} />}
          {tab === "packing" && <PackingTab trip={trip} onChange={saveTrip} />}
          {tab === "notes" && <NotesTab trip={trip} onChange={saveTrip} />}
        </div>
        <aside className="no-print hidden lg:block">
          <div className="sticky top-20 h-[calc(100dvh-7rem)] overflow-hidden rounded-3xl shadow-card">
            <RouteMap stops={trip.stops} activePlaceId={activePlace} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lift lg:bottom-8"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-savanna-400" /> {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Route; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-white/60">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-0.5 truncate font-display text-sm font-semibold capitalize text-white">{value}</dd>
    </div>
  );
}

function NotesTab({ trip, onChange }: { trip: Trip; onChange: (t: Trip) => void }) {
  const [value, setValue] = useState(trip.notes);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const checklist = useMemo(
    () => [
      "Apply for the Kenya eTA (etakenya.go.ke) at least 2 weeks before you fly",
      "Check vaccination requirements for your route with a travel clinic",
      "Save emergency numbers: 999 / 112 (police & ambulance)",
      "Tell your bank you're travelling; carry some cash for park tips",
      "Download offline Google Maps for each region",
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-lg font-bold">Trip notes</h3>
        <p className="text-sm text-ink-muted">Confirmation numbers, guide contacts, ideas from friends — saved automatically.</p>
        <Textarea
          rows={10}
          className="mt-4"
          value={value}
          placeholder="e.g. Driver: Joseph +254 7xx xxx xxx · Balloon pick-up 05:15 at the lodge gate…"
          onChange={(e) => {
            setValue(e.target.value);
            window.clearTimeout(timer.current);
            const v = e.target.value;
            timer.current = window.setTimeout(() => onChange({ ...trip, notes: v }), 500);
          }}
        />
      </Card>
      <Card className="p-5">
        <h3 className="text-lg font-bold">Before you fly</h3>
        <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
          {checklist.map((c) => (
            <li key={c} className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-savanna-50 text-savanna-600">
                <Check className="h-3 w-3" />
              </span>
              {c}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
