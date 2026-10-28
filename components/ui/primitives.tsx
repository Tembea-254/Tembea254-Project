import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-ink/[0.06] bg-white shadow-card", className)} {...props} />;
}

const badgeTones = {
  green: "bg-savanna-50 text-savanna-700",
  red: "bg-maasai-50 text-maasai-600",
  ochre: "bg-ochre-50 text-ochre-600",
  violet: "bg-dusk-50 text-dusk-500",
  ink: "bg-ink text-white",
  glass: "glass text-white",
  neutral: "bg-sand-100 text-ink-soft",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold tracking-wide", badgeTones[tone], className)}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-savanna-400 focus:outline-none focus:ring-4 focus:ring-savanna-100",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink placeholder:text-ink-muted/70 focus:border-savanna-400 focus:outline-none focus:ring-4 focus:ring-savanna-100",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-ink/10 bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-sm text-ink focus:border-savanna-400 focus:outline-none focus:ring-4 focus:ring-savanna-100",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230E2E24%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  className,
  dark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-3 text-sm", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-savanna-500" : dark ? "bg-white/25" : "bg-ink/15",
        )}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-all",
        active ? "border-savanna-500 bg-savanna-500 text-white shadow-glow" : "border-ink/10 bg-white text-ink-soft hover:border-ink/25 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-2xl bg-sand-100 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 font-display text-sm font-semibold transition-all",
            value === o.value ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, className, tone = "green" }: { value: number; className?: string; tone?: "green" | "red" | "ochre" }) {
  const c = tone === "red" ? "bg-maasai-500" : tone === "ochre" ? "bg-ochre-400" : "bg-savanna-500";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-sand-100", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action, className }: { eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
