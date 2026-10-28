import { cn } from "@/lib/utils";

/** Tembea254 mark: a winding road (tembea = "walk/travel") through a sun, in Kenyan colours. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#0E2E24" />
      <circle cx="26" cy="14" r="6" fill="#F2B13A" />
      <path d="M6 33c6-1 9-5 12-9s7-7 16-7" stroke="#14A85F" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M6 33c6-1 9-5 12-9s7-7 16-7" stroke="#fff" strokeWidth="1.2" strokeDasharray="2.5 3" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="17" r="2.4" fill="#C8102E" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-[19px] font-bold tracking-tight", light ? "text-white" : "text-ink")}>
        tembea<span className="text-savanna-500">254</span>
      </span>
    </span>
  );
}
