"use client";

import { ArrowRight, BedDouble, Bus, Calculator, Check, CircleDollarSign, Landmark, Pencil, Plus, Scale, Ticket, Trash2, UtensilsCrossed, Users } from "lucide-react";
import { staysFor } from "@/lib/data/stays";
import { useMemo, useState } from "react";
import type { Expense, ExpenseCategory, Trip } from "@/lib/planner/types";
import { cn, money, todayISO, uid, type Currency } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, Input, Progress, Select } from "../ui/primitives";

const CATS: Record<ExpenseCategory, { label: string; icon: typeof Bus; color: string }> = {
  stay: { label: "Stays", icon: BedDouble, color: "bg-dusk-500" },
  transport: { label: "Transport", icon: Bus, color: "bg-maasai-500" },
  activities: { label: "Activities", icon: Ticket, color: "bg-savanna-500" },
  parks: { label: "Park fees", icon: Landmark, color: "bg-ochre-400" },
  food: { label: "Food & drink", icon: UtensilsCrossed, color: "bg-ochre-600" },
  other: { label: "Other & tips", icon: CircleDollarSign, color: "bg-ink-muted" },
};

export function BudgetTab({ trip, onChange, currency }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency }) {
  const plannedTotal = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const spent = trip.expenses.reduce((a, e) => a + e.amount, 0);
  const over = plannedTotal > trip.budgetLimit;
  const nights = trip.stops.reduce((a, s) => a + s.nights, 0) || 1;

  const [editing, setEditing] = useState(false);
  /** scale every category proportionally so the plan adds up to the budget limit */
  const spread = () => {
    if (!trip.budgetLimit || !plannedTotal) return;
    const k = trip.budgetLimit / plannedTotal;
    const planned = Object.fromEntries(Object.entries(trip.planned).map(([c, v]) => [c, Math.round((v * k) / 100) * 100])) as Trip["planned"];
    onChange({ ...trip, planned });
  };

  const spentBy = useMemo(() => {
    const m = Object.fromEntries(Object.keys(CATS).map((k) => [k, 0])) as Record<ExpenseCategory, number>;
    trip.expenses.forEach((e) => (m[e.category] += e.amount));
    return m;
  }, [trip.expenses]);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Planned trip cost</p>
            <p className="font-display text-3xl font-bold">{money(plannedTotal, currency)}</p>
            <p className="text-sm text-ink-muted">
              ≈ {money(plannedTotal / trip.travelers, currency)} per person · {money(plannedTotal / nights, currency)} per night
            </p>
          </div>
          <label className="w-full text-xs text-ink-muted sm:max-w-[220px]">
            Your budget limit (KES)
            <Input
              type="number"
              min={0}
              step={5000}
              value={trip.budgetLimit}
              onChange={(e) => onChange({ ...trip, budgetLimit: Math.max(0, Number(e.target.value) || 0) })}
              className="mt-1 font-display font-semibold"
            />
          </label>
        </div>
        <Progress className="mt-5 h-3" value={(plannedTotal / Math.max(1, trip.budgetLimit)) * 100} tone={over ? "red" : "green"} />
        <p className={cn("mt-2 text-sm", over ? "text-maasai-600" : "text-ink-soft")}>
          {over
            ? `${money(plannedTotal - trip.budgetLimit, currency)} over your limit — try a different stay tier on the Route tab.`
            : `${money(trip.budgetLimit - plannedTotal, currency)} left in your budget.`}
        </p>

        {/* Stacked bar */}
        <div className="mt-6 flex h-3 overflow-hidden rounded-full">
          {(Object.keys(CATS) as ExpenseCategory[]).map((k) => (
            <div key={k} className={CATS[k].color} style={{ width: `${(trip.planned[k] / Math.max(1, plannedTotal)) * 100}%` }} title={CATS[k].label} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold">Where the money goes</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={spread} disabled={!trip.budgetLimit} title="Scale every category so the plan matches your budget limit">
              <Scale className="h-4 w-4" /> Fit to my budget
            </Button>
            <Button size="sm" variant={editing ? "primary" : "dark"} onClick={() => setEditing((e) => !e)}>
              {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} {editing ? "Done" : "Adjust amounts"}
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(CATS) as ExpenseCategory[]).map((k) => {
            const C = CATS[k];
            const pct = Math.round((trip.planned[k] / Math.max(1, plannedTotal)) * 100);
            return (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white", C.color)}>
                  <C.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {C.label} <span className="text-xs font-normal text-ink-muted">· {pct}%</span>
                  </p>
                  <p className="truncate text-xs text-ink-muted">Spent {money(spentBy[k], currency)}</p>
                </div>
                {editing ? (
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={trip.planned[k]}
                    onChange={(e) => onChange({ ...trip, planned: { ...trip.planned, [k]: Math.max(0, Number(e.target.value) || 0) } })}
                    className="h-10 w-28 shrink-0 px-3 text-right font-display text-sm font-semibold"
                    aria-label={`${C.label} amount in KES`}
                  />
                ) : (
                  <span className="shrink-0 font-display text-sm font-semibold">{money(trip.planned[k], currency)}</span>
                )}
              </div>
            );
          })}
        </div>
        {editing && <p className="mt-2 text-xs text-ink-muted">Amounts are in KES for your whole group. Changing your route recalculates them.</p>}
        <p className="mt-4 text-xs text-ink-muted">Estimates use indicative 2026 prices (rooms shared by two, non-resident park fees). Confirm with suppliers before booking.</p>
      </Card>

      <BudgetEstimator trip={trip} onChange={onChange} currency={currency} />

      <ExpenseTracker trip={trip} onChange={onChange} currency={currency} spent={spent} />
    </div>
  );
}

function ExpenseTracker({ trip, onChange, currency, spent }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency; spent: number }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState(trip.travelerNames[0]);

  const [formError, setFormError] = useState<string | null>(null);
  const add = () => {
    const a = Number(amount);
    if (!label.trim()) return setFormError("Say what the expense was.");
    if (!(a > 0)) return setFormError("Enter an amount in KES.");
    setFormError(null);
    const e: Expense = { id: uid("e_"), label: label.trim(), amount: a, category, paidBy, date: todayISO() };
    onChange({ ...trip, expenses: [e, ...trip.expenses] });
    setLabel("");
    setAmount("");
  };

  const settle = useMemo(() => settleUp(trip.travelerNames, trip.expenses), [trip.travelerNames, trip.expenses]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">Expenses on the road</h3>
          <p className="text-sm text-ink-muted">Log what you spend and split it with your travel crew.</p>
        </div>
        <p className="shrink-0 text-right font-display text-lg font-bold">
          <span className="block text-[11px] font-normal text-ink-muted">Spent</span>
          {money(spent, currency)}
        </p>
      </div>

      <form
        className="mt-4 rounded-2xl border border-ink/10 bg-sand-50/60 p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="col-span-2 text-xs font-medium text-ink-soft lg:col-span-1">
            What was it?
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Nyama choma lunch" className="mt-1 bg-white" />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Amount (KES)
            <Input type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1 bg-white" />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="mt-1 bg-white">
              {(Object.keys(CATS) as ExpenseCategory[]).map((k) => (
                <option key={k} value={k}>
                  {CATS[k].label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Paid by
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="mt-1 bg-white">
              {trip.travelerNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="dark" className="w-full lg:w-auto">
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </div>
        </div>
        {formError && <p className="mt-2 text-xs font-medium text-maasai-600">{formError}</p>}
      </form>

      {trip.expenses.length > 0 ? (
        <ul className="mt-4 divide-y divide-ink/[0.06]">
          {trip.expenses.map((e) => {
            const C = CATS[e.category];
            return (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <span className={cn("grid h-8 w-8 place-items-center rounded-xl text-white", C.color)}>
                  <C.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.label}</p>
                  <p className="text-xs text-ink-muted">
                    {C.label} · paid by {e.paidBy}
                  </p>
                </div>
                <span className="font-display text-sm font-semibold">{money(e.amount, currency)}</span>
                <button onClick={() => onChange({ ...trip, expenses: trip.expenses.filter((x) => x.id !== e.id) })} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-maasai-50 hover:text-maasai-500" aria-label="Delete expense">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-muted">No expenses yet. Add your first one above — it works offline too.</p>
      )}

      {trip.travelers > 1 && (
        <div className="mt-6 rounded-2xl bg-sand-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-sm font-semibold">
              <Users className="h-4 w-4" /> Travellers & settle-up
            </p>
            <div className="flex flex-wrap gap-2">
              {trip.travelerNames.map((n, i) => (
                <input
                  key={i}
                  value={n}
                  onChange={(e) => {
                    const names = [...trip.travelerNames];
                    const old = names[i];
                    names[i] = e.target.value;
                    onChange({ ...trip, travelerNames: names, expenses: trip.expenses.map((x) => (x.paidBy === old ? { ...x, paidBy: e.target.value } : x)) });
                  }}
                  className="w-28 rounded-full border border-ink/10 bg-white px-3 py-1 text-xs"
                  aria-label={`Traveller ${i + 1} name`}
                />
              ))}
            </div>
          </div>
          {settle.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {settle.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-medium">{s.from}</span>
                  <ArrowRight className="h-4 w-4 text-ink-muted" />
                  <span className="font-medium">{s.to}</span>
                  <span className="ml-auto font-display font-semibold text-savanna-700">{money(s.amount, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Everyone is square.</p>
          )}
        </div>
      )}
    </Card>
  );
}

const TIERS = [
  { id: "budget", label: "Budget", note: "Camps & guesthouses, shared transport", food: 1800, act: 0.6, transport: 0.85, other: 0.05 },
  { id: "mid", label: "Mid-range", note: "Lodges & comfy hotels, private van", food: 3500, act: 1, transport: 1, other: 0.07 },
  { id: "luxury", label: "Luxury", note: "Top camps, flights between parks", food: 2500, act: 1.6, transport: 1.8, other: 0.1 },
] as const;

/** Rough whole-trip estimate at three comfort levels, built from the real stays and costs on this route. */
function BudgetEstimator({ trip, onChange, currency }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency }) {
  const rooms = Math.max(1, Math.ceil(trip.travelers / 2));
  const nights = trip.stops.reduce((a, s) => a + s.nights, 0);
  const days = Math.max(1, trip.days.length);
  const est = TIERS.map((t) => {
    const stay = trip.stops.reduce((sum, st) => {
      const list = staysFor(st.placeId);
      const pool = list.filter((x) => x.tier === t.id);
      const rate = pool.length ? Math.min(...pool.map((x) => x.perNight)) : st.stayPerNight;
      return sum + rate * st.nights * rooms;
    }, 0);
    const food = t.food * trip.travelers * days;
    const activities = trip.planned.activities * t.act;
    const transport = trip.planned.transport * t.transport;
    const parks = trip.planned.parks;
    const other = (stay + transport) * t.other;
    const total = Math.round((stay + food + activities + transport + parks + other) / 1000) * 1000;
    return { ...t, total, perPerson: total / trip.travelers, perDay: total / trip.travelers / days, planned: { stay, food, activities, transport, parks, other } };
  });
  const current = Object.values(trip.planned).reduce((a, b) => a + b, 0);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ochre-50 text-ochre-600">
          <Calculator className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold">Budget estimator</h3>
          <p className="text-sm text-ink-muted">
            What this {days}-day trip costs for {trip.travelers} {trip.travelers === 1 ? "traveller" : "travellers"} ({nights} nights, {rooms} {rooms === 1 ? "room" : "rooms"}) at each comfort level.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {est.map((e) => {
          const near = Math.abs(e.total - current) / Math.max(1, current) < 0.15;
          return (
            <div key={e.id} className={cn("flex flex-col rounded-2xl border p-4", near ? "border-savanna-500 bg-savanna-50/50" : "border-ink/10")}>
              <p className="flex items-center justify-between font-display text-sm font-semibold">
                {e.label}
                {near && <span className="rounded-full bg-savanna-500 px-2 py-0.5 text-[10px] text-white">Your plan</span>}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{money(e.total, currency)}</p>
              <p className="text-xs text-ink-muted">
                {money(e.perPerson, currency)} per person · {money(e.perDay, currency)} per person per day
              </p>
              <p className="mt-2 text-xs text-ink-soft">{e.note}</p>
              <Button
                size="sm"
                variant={trip.budgetLimit === e.total ? "soft" : "outline"}
                className="mt-4"
                onClick={() => onChange({ ...trip, budgetLimit: e.total, planned: Object.fromEntries(Object.entries(e.planned).map(([k, v]) => [k, Math.round(v / 100) * 100])) as Trip["planned"] })}
              >
                {trip.budgetLimit === e.total ? <Check className="h-4 w-4" /> : null} {trip.budgetLimit === e.total ? "Using this" : "Use this budget"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Uses the cheapest stay in each tier along your route, about {money(TIERS[1].food, currency)} for food per person per day at mid-range, plus your transport, park fees and activities. Indicative only.
      </p>
    </Card>
  );
}

/** Equal split, then greedily match debtors to creditors — the fewest transfers for small groups. */
function settleUp(names: string[], expenses: Expense[]) {
  if (names.length < 2 || !expenses.length) return [];
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const share = total / names.length;
  const bal = names.map((n) => ({ n, v: expenses.filter((e) => e.paidBy === n).reduce((a, e) => a + e.amount, 0) - share }));
  const debtors = bal.filter((b) => b.v < -1).sort((a, b) => a.v - b.v);
  const creditors = bal.filter((b) => b.v > 1).sort((a, b) => b.v - a.v);
  const out: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(-debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].n, to: creditors[j].n, amount: Math.round(amt) });
    debtors[i].v += amt;
    creditors[j].v -= amt;
    if (Math.abs(debtors[i].v) < 1) i++;
    if (Math.abs(creditors[j].v) < 1) j++;
  }
  return out;
}
