import Link from "next/link";
import { ArrowLeft, Check, Clock, FileCheck2, LayoutPanelLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/** Where an application stands: Submitted → In review → Approved → Workspace in the sidebar. */
export function ApplicationStatus({ kind, submittedAt, summary }: { kind: "seller" | "creator"; submittedAt?: Date | string | null; summary: { label: string; value: string }[] }) {
  const ws = kind === "seller" ? "Seller centre" : "Creator studio";
  const steps = [
    { icon: Send, t: "Application sent", d: submittedAt ? new Date(submittedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "Received", state: "done" },
    { icon: Clock, t: "In review", d: kind === "seller" ? "We check your ID, KRA PIN and details" : "We look at your work and equipment", state: "now" },
    { icon: FileCheck2, t: "Approved", d: "You'll get a notification", state: "next" },
    { icon: LayoutPanelLeft, t: `${ws} opens`, d: "It appears in your sidebar", state: "next" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ochre-50 px-3 py-1 font-display text-xs font-semibold text-ochre-700">
          <Clock className="h-3.5 w-3.5" /> In review
        </span>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Thanks — your {kind} application is with our team</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">Reviews usually take up to 2 working days. You don&apos;t need to do anything else — we&apos;ll notify you, and your {ws} will appear in the sidebar as soon as you&apos;re approved.</p>
        <ol className="mt-6 space-y-0">
          {steps.map((s, i) => (
            <li key={s.t} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && <span className={cn("absolute left-5 top-11 h-[calc(100%-2.75rem)] w-0.5", s.state === "done" ? "bg-savanna-500" : "bg-sand-200")} />}
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                  s.state === "done" ? "bg-savanna-500 text-white" : s.state === "now" ? "bg-ochre-400 text-ink ring-4 ring-ochre-100" : "bg-sand-100 text-ink-muted",
                )}
              >
                {s.state === "done" ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </span>
              <span className="pt-1">
                <span className={cn("block font-display font-semibold", s.state === "next" && "text-ink-muted")}>{s.t}</span>
                <span className="text-sm text-ink-muted">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/marketplace" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-display text-sm font-semibold text-white">
          <ArrowLeft className="h-4 w-4" /> Back to the marketplace
        </Link>
      </section>
      <aside className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display font-bold">What you sent</h2>
        <dl className="mt-3 divide-y divide-ink/[0.06] text-sm">
          {summary
            .filter((x) => x.value)
            .map((x) => (
              <div key={x.label} className="flex justify-between gap-3 py-2">
                <dt className="text-ink-muted">{x.label}</dt>
                <dd className="text-right font-medium">{x.value}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 text-xs text-ink-muted">Need to change something? Email support@tembea254.app and quote your account email.</p>
      </aside>
    </div>
  );
}
