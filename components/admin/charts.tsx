import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* Server-rendered SVG charts for the control centre — no client JS, crisp at any size. */

const C = { green: "#14A85F", ochre: "#D98E04", violet: "#5B3FD1", red: "#C8102E", ink: "#0E2E24", grid: "#ECE3D2", muted: "#6B8178" };
export const CHART = C;

/** Percentage change vs the previous period; null when there's nothing to compare against. */
export function pctChange(now: number, prev: number) {
  if (!prev) return now ? null : 0;
  return ((now - prev) / prev) * 100;
}

export function Delta({ value, invert, className }: { value: number | null; invert?: boolean; className?: string }) {
  if (value === null) return <span className={cn("inline-flex items-center gap-0.5 rounded-full bg-savanna-50 px-1.5 py-0.5 text-[11px] font-semibold text-savanna-700", className)}>New</span>;
  const up = value > 0.5;
  const down = value < -0.5;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        good ? "bg-savanna-50 text-savanna-700" : bad ? "bg-maasai-50 text-maasai-600" : "bg-sand-100 text-ink-soft",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value) >= 1000 ? "999+" : Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%
    </span>
  );
}

function path(values: number[], w: number, h: number, pad = 2, max?: number) {
  const m = Math.max(1, max ?? Math.max(...values));
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [pad + i * step, h - pad - (v / m) * (h - pad * 2)] as const);
}
const line = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function Sparkline({ values, color = C.green, className }: { values: number[]; color?: string; className?: string }) {
  const w = 120,
    h = 36;
  const pts = path(values, w, h);
  const id = `sp${color.slice(1)}${values.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-9 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line(pts)} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`} fill={`url(#${id})`} />
      <path d={line(pts)} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Headline metric: value, change vs previous period and a sparkline. */
export function KpiCard({ label, value, delta, spark, icon: Icon, color = C.green, href, hint, invert }: { label: string; value: React.ReactNode; delta?: number | null; spark?: number[]; icon: LucideIcon; color?: string; href?: string; hint?: string; invert?: boolean }) {
  const body = (
    <div className={cn("flex h-full flex-col rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink/[0.04] sm:p-5", href && "transition-shadow hover:shadow-lift")}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `${color}14`, color }}>
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </span>
        {delta !== undefined && <Delta value={delta} invert={invert} />}
      </div>
      <p className="mt-3 truncate font-display text-[1.65rem] font-bold leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      {spark && spark.length > 1 && <Sparkline values={spark} color={color} className="mt-auto pt-3" />}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/** The hero chart: this period as an area, the previous period as a dashed line. */
export function AreaChart({ data, prev, format = (n) => String(n), color = C.green, height = 220 }: { data: { label: string; value: number }[]; prev?: number[]; format?: (n: number) => string; color?: string; height?: number }) {
  const w = 720,
    h = height,
    left = 8,
    bottom = 22;
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values, ...(prev ?? []));
  const nice = niceMax(max);
  const innerH = h - bottom - 8;
  const pts = path(values, w - left, innerH, 4, nice).map(([x, y]) => [x + left, y + 8] as const);
  const prevPts = prev ? path(prev, w - left, innerH, 4, nice).map(([x, y]) => [x + left, y + 8] as const) : null;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(data.length / 6);
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 text-[10px] text-ink-muted">
        {ticks.map((t) => (
          <span key={t} className="absolute right-2 -translate-y-1/2 whitespace-nowrap" style={{ top: `${((8 + innerH - 4 - t * (innerH - 8)) / h) * 100}%` }}>
            {format(Math.round(nice * t))}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="ml-14 h-auto w-[calc(100%-3.5rem)]" role="img" aria-label={`Chart: total ${format(values.reduce((a, b) => a + b, 0))}`}>
        <defs>
          <linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = 8 + innerH - 4 - t * (innerH - 8);
          return <line key={t} x1={left} x2={w} y1={y} y2={y} stroke={C.grid} strokeDasharray={t ? "3 4" : undefined} />;
        })}
        {prevPts && <path d={line(prevPts)} fill="none" stroke={C.muted} strokeOpacity="0.55" strokeWidth="1.6" strokeDasharray="5 5" />}
        <path d={`${line(pts)} L${pts[pts.length - 1][0]},${8 + innerH - 4} L${pts[0][0]},${8 + innerH - 4} Z`} fill="url(#area-g)" />
        <path d={line(pts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <g key={i} className="group">
            <rect x={x - (w / data.length) / 2} y={0} width={w / data.length} height={h - bottom} fill="transparent" />
            <circle cx={x} cy={y} r="4" fill="#fff" stroke={color} strokeWidth="2" className="opacity-0 transition-opacity group-hover:opacity-100" />
            <title>{`${data[i].label}: ${format(data[i].value)}${prev ? ` (previous: ${format(prev[i] ?? 0)})` : ""}`}</title>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.label} x={pts[i][0]} y={h - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="10" fill={C.muted}>
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function niceMax(n: number) {
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Share of a whole (five slices or fewer — the rest is grouped as "Other"). */
export function Donut({ parts, format = (n) => String(n), center }: { parts: { label: string; value: number; color: string }[]; format?: (n: number) => string; center?: { value: string; label: string } }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const r = 42,
    c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Share chart">
          <circle cx="50" cy="50" r={r} fill="none" stroke={C.grid} strokeWidth="12" />
          {total > 0 &&
            parts.map((p) => {
              const len = (p.value / total) * c;
              const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="12" strokeDasharray={`${Math.max(0, len - 1.2)} ${c}`} strokeDashoffset={-acc} />;
              acc += len;
              return el;
            })}
        </svg>
        {center && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block font-display text-lg font-bold leading-tight">{center.value}</span>
              <span className="text-[10px] text-ink-muted">{center.label}</span>
            </span>
          </div>
        )}
      </div>
      <ul className="w-full space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <span className="font-display font-semibold">{total ? Math.round((p.value / total) * 100) : 0}%</span>
            <span className="w-24 shrink-0 text-right text-xs text-ink-muted">{format(p.value)}</span>
          </li>
        ))}
        {!total && <li className="text-ink-muted">No sales in this period yet.</li>}
      </ul>
    </div>
  );
}

/** Ranked list with proportional bars. */
export function RankBars({ rows, format = (n) => String(n), color = C.green }: { rows: { label: string; value: number; hint?: string }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-muted">Nothing yet — this fills in as travellers save AI trip plans.</p>;
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 font-display text-xs font-bold text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
              {r.label}
              {r.hint && <span className="ml-1.5 text-xs text-ink-muted">{r.hint}</span>}
            </span>
            <span className="shrink-0 font-display font-semibold">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sand-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
