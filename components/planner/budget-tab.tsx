"use client";

import { ArrowRight, BedDouble, Bus, CircleDollarSign, Landmark, Plus, Ticket, Trash2, UtensilsCrossed, Users } from "lucide-react";
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
          <label className="w-full max-w-[220px] text-xs text-ink-muted">
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
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(Object.keys(CATS) as ExpenseCategory[]).map((k) => {
            const C = CATS[k];
            return (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3">
                <span className={cn("grid h-9 w-9 place-items-center rounded-xl text-white", C.color)}>
                  <C.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{C.label}</p>
                  <p className="text-xs text-ink-muted">
                    Spent {money(spentBy[k], currency)} of {money(trip.planned[k], currency)}
                  </p>
                </div>
                <span className="font-display text-sm font-semibold">{money(trip.planned[k], currency)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-muted">Estimates use indicative 2026 prices (rooms shared by two, non-resident park fees). Confirm with suppliers before booking.</p>
      </Card>

      <ExpenseTracker trip={trip} onChange={onChange} currency={currency} spent={spent} />
    </div>
  );
}

function ExpenseTracker({ trip, onChange, currency, spent }: { trip: Trip; onChange: (t: Trip) => void; currency: Currency; spent: number }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState(trip.travelerNames[0]);

  const add = () => {
    const a = Number(amount);
    if (!label.trim() || !a) return;
    const e: Expense = { id: uid("e_"), label: label.trim(), amount: a, category, paidBy, date: todayISO() };
    onChange({ ...trip, expenses: [e, ...trip.expenses] });
    setLabel("");
    setAmount("");
  };

  const settle = useMemo(() => settleUp(trip.travelerNames, trip.expenses), [trip.travelerNames, trip.expenses]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-lg font-bold">Expenses on the road</h3>
          <p className="text-sm text-ink-muted">Log what you spend and split it with your travel crew.</p>
        </div>
        <p className="font-display text-lg font-bold">{money(spent, currency)}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_140px_140px_auto]">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Nyama choma lunch" onKeyDown={(e) => e.key === "Enter" && add()} aria-label="Expense" />
        <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="KES" aria-label="Amount" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} aria-label="Category">
          {(Object.keys(CATS) as ExpenseCategory[]).map((k) => (
            <option key={k} value={k}>
              {CATS[k].label}
            </option>
          ))}
        </Select>
        <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} aria-label="Paid by">
          {trip.travelerNames.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
        <Button onClick={add} disabled={!label.trim() || !Number(amount)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

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
