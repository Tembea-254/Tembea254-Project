import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared building blocks for the admin, vendor and creator dashboards (server-safe). */

export function PageHeader({ title, text, actions, eyebrow }: { title: string; text?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-savanna-600">{eyebrow}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {text && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = "green", href }: { label: string; value: React.ReactNode; hint?: string; icon?: LucideIcon; tone?: "green" | "red" | "ochre" | "violet" | "ink"; href?: string }) {
  const tones = { green: "bg-savanna-50 text-savanna-700", red: "bg-maasai-50 text-maasai-600", ochre: "bg-ochre-50 text-ochre-700", violet: "bg-dusk-50 text-dusk-500", ink: "bg-ink text-white" };
  const body = (
    <div className={cn("flex h-full items-start gap-3 rounded-3xl bg-white p-4 shadow-card", href && "transition-shadow hover:shadow-lift")}>
      {Icon && (
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-0.5 truncate font-display text-xl font-bold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl bg-white p-4 shadow-card sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-savanna-50 text-savanna-700",
  verified: "bg-savanna-50 text-savanna-700",
  approved: "bg-savanna-50 text-savanna-700",
  published: "bg-savanna-50 text-savanna-700",
  paid: "bg-savanna-50 text-savanna-700",
  delivered: "bg-savanna-50 text-savanna-700",
  purchased: "bg-savanna-50 text-savanna-700",
  visible: "bg-savanna-50 text-savanna-700",
  "deposit-paid": "bg-savanna-50 text-savanna-700",
  completed: "bg-savanna-50 text-savanna-700",
  confirmed: "bg-savanna-50 text-savanna-700",
  live: "bg-maasai-500 text-white",
  scheduled: "bg-dusk-50 text-dusk-500",
  shipped: "bg-dusk-50 text-dusk-500",
  processing: "bg-dusk-50 text-dusk-500",
  in_review: "bg-dusk-50 text-dusk-500",
  pending: "bg-ochre-50 text-ochre-700",
  pending_payment: "bg-ochre-50 text-ochre-700",
  submitted: "bg-ochre-50 text-ochre-700",
  requested: "bg-ochre-50 text-ochre-700",
  proposed: "bg-ochre-50 text-ochre-700",
  open: "bg-ochre-50 text-ochre-700",
  "deposit-pending": "bg-ochre-50 text-ochre-700",
  draft: "bg-sand-100 text-ink-soft",
  hidden: "bg-sand-100 text-ink-soft",
  ended: "bg-sand-100 text-ink-soft",
  dismissed: "bg-sand-100 text-ink-soft",
  resolved: "bg-sand-100 text-ink-soft",
  rejected: "bg-maasai-50 text-maasai-600",
  suspended: "bg-maasai-50 text-maasai-600",
  failed: "bg-maasai-50 text-maasai-600",
  cancelled: "bg-maasai-50 text-maasai-600",
  refunded: "bg-maasai-50 text-maasai-600",
  removed: "bg-maasai-50 text-maasai-600",
  admin: "bg-ink text-white",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[11px] font-semibold capitalize", STATUS_TONE[status] ?? "bg-sand-100 text-ink-soft")}>{label ?? status.replace(/[_-]/g, " ")}</span>;
}

/** Link-based filter chips: keeps filters in the URL so pages stay server-rendered and shareable. */
export function FilterTabs({ base, param = "status", value, options }: { base: string; param?: string; value: string; options: { value: string; label: string; count?: number }[] }) {
  return (
    <div className="scrollbar-none -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const on = o.value === value;
        const href = o.value ? `${base}?${param}=${encodeURIComponent(o.value)}` : base;
        return (
          <Link key={o.value || "all"} href={href} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors", on ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink-soft hover:border-ink/25")}>
            {o.label}
            {o.count != null && <span className={cn("rounded-full px-1.5 text-[11px]", on ? "bg-white/20" : "bg-sand-100")}>{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function SearchBox({ action, value, placeholder, hidden }: { action: string; value?: string; placeholder?: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} className="mb-4 flex gap-2">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="q" defaultValue={value} placeholder={placeholder || "Search…"} aria-label="Search" className="h-11 min-w-0 flex-1 rounded-2xl border border-ink/10 bg-white px-4 text-sm outline-none focus:border-savanna-500" />
      <button className="h-11 shrink-0 rounded-2xl bg-ink px-5 font-display text-sm font-semibold text-white">Search</button>
    </form>
  );
}

/** Responsive table: a real table on wide screens, stacked cards on phones. */
export function DataTable<T>({ rows, cols, empty, rowKey }: { rows: T[]; cols: { label: string; cell: (r: T) => React.ReactNode; className?: string; hideSm?: boolean }[]; empty?: string; rowKey: (r: T) => string }) {
  if (!rows.length) return <Empty text={empty || "Nothing here yet."} />;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-3xl bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/[0.06] text-xs uppercase tracking-wider text-ink-muted">
              {cols.map((c) => (
                <th key={c.label} className={cn("whitespace-nowrap px-4 py-3 font-display font-semibold", c.className)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-ink/[0.04] align-top last:border-0 hover:bg-sand-50/50">
                {cols.map((c) => (
                  <td key={c.label} className={cn("px-4 py-3", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-3xl bg-white p-4 shadow-card">
            <dl className="space-y-2 text-sm">
              {cols
                .filter((c) => !c.hideSm)
                .map((c) => (
                  <div key={c.label} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 pt-0.5 text-xs font-medium text-ink-muted">{c.label}</dt>
                    <dd className="min-w-0 text-right">{c.cell(r)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="rounded-3xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-ink-muted">{text}</p>;
}

export function Field({ label, children, hint, className, group }: { label: string; children: React.ReactNode; hint?: string; className?: string; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cn("block text-sm font-medium", className)}>
      {label}
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs font-normal text-ink-muted">{hint}</span>}
    </Tag>
  );
}

export const inputCls = "h-11 w-full rounded-2xl border border-ink/10 bg-white px-3.5 text-sm outline-none focus:border-savanna-500";
export const textareaCls = "w-full rounded-2xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-savanna-500";

export const kes = (n: number | null | undefined) => `KES ${Math.round(n ?? 0).toLocaleString("en-KE")}`;
export const when = (d: Date | string | number | null | undefined) =>
  d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const day = (d: Date | string | number | null | undefined) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Tiny server-rendered bar chart (no JS). */
export function Bars({ data, format = (n: number) => String(n), tone = "#14A85F", label }: { data: { label: string; value: number }[]; format?: (n: number) => string; tone?: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-display font-bold">{format(total)}</span>
      </figcaption>
      <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={`${label}: ${format(total)} over ${data.length} days`}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex-1">
            <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: d.value ? tone : "#ECE3D2", minHeight: 2 }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {d.label}: {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

export function mediaSrc(u: string | null | undefined, w = 600, h?: number) {
  if (!u) return "";
  if (/^(https?:)?\/\//.test(u) || u.startsWith("/")) return u;
  return `https://images.unsplash.com/${u}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=70`;
}
