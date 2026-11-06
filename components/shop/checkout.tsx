"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Home, Loader2, Lock, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Store, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProductCard as P } from "@/lib/repo/shop";
import { KENYA_COUNTIES, PICKUP_STATIONS, SERVICE_UNITS } from "@/lib/data/shop";
import { deliveryWindow, fmtDay, zoneFor } from "@/lib/delivery";
import { cn, money } from "@/lib/utils";
import { useCart, type CartLine } from "./cart";
import { mediaUrl } from "./media";
import { ExpressBadge } from "./ui";

const input = "h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500";

export function Checkout({ me, fees }: { me: { name: string; phone: string }; fees: { home: number; nairobi: number; pickup: number; freeOver: number } }) {
  const { lines, setQty, clear } = useCart();
  const router = useRouter();
  const [products, setProducts] = useState<P[] | null>(null);
  const [form, setForm] = useState({ name: me.name, phone: me.phone, county: "Nairobi", town: "", details: "" });
  const [method, setMethod] = useState<"home" | "pickup">("home");
  const [station, setStation] = useState<string>(PICKUP_STATIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const ids = Array.from(new Set(lines.map((l) => l.productId))).sort().join(",");

  useEffect(() => {
    if (!ids) return setProducts([]);
    fetch(`/api/shop/products?ids=${ids}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [ids]);

  const rows = lines.map((l) => ({ l, p: products?.find((p) => p.id === l.productId) })).filter((r) => r.p) as { l: CartLine; p: P }[];
  const goods = rows.filter((r) => r.p.kind === "product");
  const bookings = rows.filter((r) => r.p.kind === "service");
  const goodsTotal = goods.reduce((a, r) => a + r.p.price * r.l.qty, 0);
  const subtotal = rows.reduce((a, r) => a + r.p.price * r.l.qty, 0);
  const st = PICKUP_STATIONS.find((x) => x.id === station)!;
  const county = method === "pickup" ? st.county : form.county;
  const fee = !goods.length || goodsTotal >= fees.freeOver ? 0 : method === "pickup" ? fees.pickup : zoneFor(county) === "metro" ? fees.nairobi : fees.home;
  const total = subtotal + fee;
  const express = goods.length > 0 && goods.every((r) => r.p.express);
  const eta = mounted && goods.length ? deliveryWindow(county, express) : null;

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, method, station, items: rows.map((r) => ({ productId: r.p.id, qty: r.l.qty, date: r.l.date, note: r.l.note })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't place the order.");
      clear();
      router.push(`/orders/${d.orderId}?new=1`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (products === null && ids)
    return (
      <p className="flex items-center gap-2 text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your cart…
      </p>
    );
  if (!rows.length)
    return (
      <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-ink-muted" />
        <p className="mt-3 font-display text-lg font-semibold">Your cart is empty</p>
        <p className="text-sm text-ink-muted">Kenyan-made goods and local pros are waiting.</p>
        <Link href="/marketplace" className="mt-4 inline-flex h-11 items-center rounded-full bg-savanna-500 px-5 font-display font-semibold text-white">
          Explore the marketplace
        </Link>
      </div>
    );

  return (
    <form onSubmit={place} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {/* Step 1: items */}
        <Section n={1} title={`Your cart (${rows.length})`}>
          <ul className="divide-y divide-ink/[0.06]">
            {rows.map(({ l, p }) => (
              <li key={p.id + (l.date ?? "")} className="flex gap-3 py-3">
                <Link href={`/marketplace/product/${p.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-sand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image && <img src={mediaUrl(p.image, 200, 200)} alt="" className="h-full w-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{p.title}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                    {p.storeName.replace(" (demo)", "")}
                    {p.express && <ExpressBadge />}
                  </p>
                  {l.date && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-dusk-50 px-2 py-0.5 text-xs font-medium text-dusk-700">
                      <CalendarDays className="h-3.5 w-3.5" /> {mounted ? fmtDay(l.date) : l.date}
                      {l.note ? ` · ${l.note.slice(0, 40)}` : ""}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-full border border-ink/15">
                      <button type="button" onClick={() => setQty(p.id, l.qty - 1, l.date)} className="grid h-9 w-9 place-items-center" aria-label="Fewer">
                        {l.qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                      <button type="button" onClick={() => setQty(p.id, p.kind === "service" ? l.qty + 1 : Math.min(p.stock, l.qty + 1), l.date)} className="grid h-9 w-9 place-items-center" aria-label="More">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-right">
                      <span className="block font-display font-semibold">{money(p.price * l.qty)}</span>
                      {p.kind === "service" && (
                        <span className="text-[11px] text-ink-muted">
                          {money(p.price)} {SERVICE_UNITS[p.unit]}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Step 2: delivery */}
        {goods.length > 0 && (
          <Section n={2} title="Delivery">
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["home", Home, "Home or hotel delivery", money(zoneFor(form.county) === "metro" ? fees.nairobi : fees.home)],
                  ["pickup", Store, "Pick-up station", money(fees.pickup)],
                ] as const
              ).map(([id, Icon, label, price]) => (
                <button key={id} type="button" onClick={() => setMethod(id)} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors", method === id ? "border-savanna-500 bg-savanna-50" : "border-ink/10 bg-white")}>
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">
                    <span className="block font-display text-sm font-semibold">{label}</span>
                    <span className="text-xs text-ink-muted">{goodsTotal >= fees.freeOver ? "Free" : price}</span>
                  </span>
                  <span className={cn("h-4 w-4 rounded-full border-2", method === id ? "border-[5px] border-savanna-600" : "border-ink/25")} />
                </button>
              ))}
            </div>
            {method === "home" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">County</span>
                  <select value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} className={input}>
                    {KENYA_COUNTIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Town or area</span>
                  <input required value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} className={input} placeholder="e.g. Westlands, or your hotel" />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">Directions (optional)</span>
                  <input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className={input} placeholder="Building, street, landmark, room number" />
                </label>
              </div>
            ) : (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block font-medium">Choose a station</span>
                <select value={station} onChange={(e) => setStation(e.target.value)} className={input}>
                  {PICKUP_STATIONS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                  <MapPin className="h-3.5 w-3.5" /> We'll SMS you a code when it's ready. Bring your ID.
                </span>
              </label>
            )}
            {eta && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-sand-50 p-3 text-sm">
                {express ? <Zap className="h-4 w-4 fill-ochre-400 text-ochre-400" /> : <CalendarDays className="h-4 w-4 text-savanna-600" />}
                Arrives{" "}
                <span className="font-semibold text-savanna-700">
                  {fmtDay(eta.from)}
                  {+eta.to !== +eta.from ? ` – ${fmtDay(eta.to)}` : ""}
                </span>
              </p>
            )}
          </Section>
        )}

        {/* Step 3: contact */}
        <Section n={goods.length ? 3 : 2} title="Your details">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Full name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} autoComplete="name" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">M-Pesa phone</span>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} inputMode="tel" placeholder="0712 345 678" autoComplete="tel" />
            </label>
          </div>
          {bookings.length > 0 && <p className="mt-3 text-xs text-ink-muted">The pro gets your name and phone to confirm the booking. Your money is held by Tembea until the service is done.</p>}
        </Section>
      </div>

      <aside className="h-fit rounded-3xl bg-white p-5 shadow-card lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold">Order summary</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {goods.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Items</dt>
              <dd>{money(goodsTotal)}</dd>
            </div>
          )}
          {bookings.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Bookings</dt>
              <dd>{money(subtotal - goodsTotal)}</dd>
            </div>
          )}
          {goods.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Delivery</dt>
              <dd>{fee ? money(fee) : "Free"}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-ink/10 pt-2 font-display text-xl font-bold">
            <dt>Total</dt>
            <dd>{money(total)}</dd>
          </div>
        </dl>
        {goods.length > 0 && fee > 0 && <p className="mt-2 text-xs text-ink-muted">Add {money(fees.freeOver - goodsTotal)} more for free delivery.</p>}
        {err && (
          <p role="alert" className="mt-3 rounded-2xl bg-maasai-50 p-3 text-sm text-maasai-700">
            {err}
          </p>
        )}
        <button disabled={busy} className="mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-savanna-500 py-3.5 font-display font-semibold text-white shadow-glow disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Pay {money(total)} with M-Pesa
        </button>
        <p className="mt-3 flex gap-2 text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-savanna-600" /> You'll get an M-Pesa prompt on your phone. Sellers are paid only after delivery — or after the service is done.
        </p>
      </aside>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs text-white">{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}
