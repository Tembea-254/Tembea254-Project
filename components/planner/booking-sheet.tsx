"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { groupPrice, SOURCE_LABEL, UNIT_TEXT, type CatalogItem } from "@/lib/catalog-types";
import { PLACE_BY_ID } from "@/lib/data/places";
import { bookingPlaceUrl } from "@/lib/data/stays";
import { addDays, cn, money, todayISO, type Currency } from "@/lib/utils";

const field = "h-11 w-full rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none focus:border-savanna-500";

/**
 * Book anything from the planner. Partners and Tembea254 providers get a request form (it reaches them
 * with a TB reference, and is recorded on our side); affiliate and online offers continue to the
 * provider's own site through a tracked referral link.
 */
export function BookingSheet({
  item,
  open,
  onClose,
  tripId,
  date,
  nights,
  travelers,
  currency,
  onBooked,
  alternatives = [],
}: {
  item: CatalogItem | null;
  open: boolean;
  onClose: () => void;
  tripId?: string;
  date: string;
  nights: number;
  travelers: number;
  currency: Currency;
  onBooked?: (ref: string) => void;
  /** other places to book the same kind of thing (operators' sites, affiliates), shown after a request */
  alternatives?: CatalogItem[];
}) {
  const { data } = useSession();
  const [start, setStart] = useState(date);
  const [people, setPeople] = useState(travelers);
  const [qty, setQty] = useState(item?.unit === "night" || item?.unit === "vehicle/day" ? Math.max(1, nights) : item?.unit === "hour" ? 4 : 1);
  const [name, setName] = useState(data?.user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(data?.user?.email ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; text: string } | null>(null);
  if (!item) return null;
  const perUnit = item.unit === "night" || item.unit === "vehicle/day" || item.unit === "day" || item.unit === "hour" || item.unit === "half day";
  const total = groupPrice(item, people, qty);
  const place = PLACE_BY_ID[item.places[0]]?.name;
  const external = item.book.mode === "external" ? item.book.go : item.book.mode === "request" ? item.book.external : undefined;

  async function submit() {
    if (!item) return;
    setError(null);
    setBusy(true);
    try {
      if (item.book.mode === "request") {
        const r = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId: item.book.offerId, startDate: start, endDate: perUnit && qty > 1 ? addDays(start, qty) : undefined, people, quantity: qty, name, phone, email, note, tripId }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Couldn't send the request");
        setDone({ ref: d.booking.ref, text: `Sent to ${d.booking.partner}. They'll contact you to confirm and take payment. Quote ${d.booking.ref}.` });
        onBooked?.(d.booking.ref);
      } else if (item.book.mode === "hire") {
        const r = await fetch("/api/hire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: item.book.providerId, start, units: qty, people, phone, note: [note, name && `Name: ${name}`, email && `Email: ${email}`].filter(Boolean).join(" · "), payDeposit: false }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Couldn't send the request");
        setDone({ ref: d.hire.id, text: d.hire.message || `Request sent to ${item.provider}.` });
        onBooked?.(d.hire.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-end justify-center bg-night/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} role="dialog" aria-modal="true" aria-label={`Book ${item.title}`} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white shadow-lift sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3 border-b border-ink/[0.06] p-5">
              <div className="min-w-0">
                <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {SOURCE_LABEL[item.source]}
                  {item.demo ? " · sample listing" : ""}
                </p>
                <h2 className="text-lg font-bold leading-snug">{item.title}</h2>
                <p className="text-sm text-ink-muted">
                  {item.provider}
                  {place ? ` · ${place}` : ""}
                </p>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center p-8 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-savanna-500 text-white">
                  <Check className="h-7 w-7" />
                </span>
                <p className="mt-4 rounded-full bg-ink px-3 py-1 font-display text-sm font-bold text-white">{done.ref}</p>
                <p className="mt-3 max-w-sm text-sm text-ink-soft">{done.text}</p>
                <p className="mt-2 text-xs text-ink-muted">Track it under My bookings.</p>
                <OtherWays item={item} alternatives={alternatives} people={people} currency={currency} place={place} />
                <button onClick={onClose} className="mt-6 h-11 rounded-full bg-ink px-6 font-display text-sm font-semibold text-white">
                  Done
                </button>
              </div>
            ) : item.book.mode === "external" ? (
              <div className="space-y-4 p-5">
                <PriceLine item={item} total={total} people={people} currency={currency} />
                <p className="text-sm text-ink-soft">This is booked on {item.provider === "Viator" || item.provider === "GetYourGuide" ? item.provider : "the provider's own website"}. We&apos;ll open it with your Tembea254 referral, so the booking is credited to us. You pay them directly.</p>
                <a href={item.book.go} target="_blank" rel="noreferrer" onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-full bg-savanna-500 font-display font-semibold text-white">
                  Continue to {item.source === "hotel" ? "their website" : item.provider} <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <form
                className="space-y-3 p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">{perUnit ? "From" : "Date"}</span>
                    <input type="date" required min={todayISO()} value={start} onChange={(e) => setStart(e.target.value)} className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">People</span>
                    <input type="number" min={1} max={60} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))} className={field} />
                  </label>
                  {perUnit && (
                    <label className="col-span-2 block">
                      <span className="mb-1 block text-xs font-medium">How many {item.unit === "night" ? "nights" : item.unit === "hour" ? "hours" : item.unit === "half day" ? "half days" : "days"}</span>
                      <input type="number" min={1} max={60} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={field} />
                    </label>
                  )}
                </div>
                <PriceLine item={item} total={total} people={people} currency={currency} />
                <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Phone / WhatsApp" inputMode="tel" required={item.book.mode === "hire"} value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
                  <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                </div>
                <textarea rows={2} placeholder={item.kind === "guide" ? "Languages, pickup point, what you'd like to see…" : "Pickup point, special requests…"} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-2xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none focus:border-savanna-500" />
                <p className="flex items-start gap-2 text-xs text-ink-muted">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-savanna-600" /> No payment now. {item.provider} confirms availability and price with you directly{item.book.mode === "request" ? ", quoting your TB reference" : ""}.
                </p>
                {error && <p className="rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">{error}</p>}
                <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-savanna-500 font-display font-semibold text-white disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send booking request
                </button>
                {external && (
                  <a href={external} target="_blank" rel="noreferrer" className="block text-center text-sm font-semibold text-savanna-700">
                    Or book on their website
                  </a>
                )}
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** After a request: the same kind of booking on other sites, so the traveller can compare or book there too. */
function OtherWays({ item, alternatives, people, currency, place }: { item: CatalogItem; alternatives: CatalogItem[]; people: number; currency: Currency; place?: string }) {
  const links = [
    ...alternatives.map((a) => ({ id: a.id, href: a.book.mode === "external" ? a.book.go : "#", who: a.provider, what: a.title, price: groupPrice(a, people, 1) ?? a.price, priceText: a.priceText })),
    ...(place && (item.kind === "stay" || item.kind === "package") ? [{ id: "booking-com", href: bookingPlaceUrl(place), who: "Booking.com", what: `Stays in ${place}`, price: undefined, priceText: "Compare hotels" }] : []),
  ].filter((l) => l.href !== "#");
  if (!links.length) return null;
  return (
    <div className="mt-6 w-full text-left">
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-ink-muted">Prefer to book elsewhere?</p>
      <ul className="mt-2 space-y-2">
        {links.map((l) => (
          <li key={l.id}>
            <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3 hover:border-savanna-500">
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold">{l.who}</span>
                <span className="block truncate text-xs text-ink-muted">{l.what}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-right text-xs font-semibold text-savanna-700">
                {l.price ? money(l.price, currency) : l.priceText}
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-muted">Opens their site with your Tembea254 referral.</p>
    </div>
  );
}

function PriceLine({ item, total, people, currency }: { item: CatalogItem; total?: number; people: number; currency: Currency }) {
  return (
    <div className={cn("flex items-end justify-between gap-3 rounded-2xl bg-sand-50 p-3")}>
      <span className="text-xs text-ink-muted">{item.price ? `${item.priceText ?? money(item.price, currency)} ${UNIT_TEXT[item.unit] ?? item.unit}` : item.priceText ?? "Price on request"}</span>
      {total ? (
        <span className="text-right">
          <span className="block font-display text-lg font-bold">{money(total, currency)}</span>
          <span className="text-[11px] text-ink-muted">estimate for {people}</span>
        </span>
      ) : null}
    </div>
  );
}
