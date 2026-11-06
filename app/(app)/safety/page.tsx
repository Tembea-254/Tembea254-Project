import type { Metadata } from "next";
import { CloudRain, HeartPulse, MapPin, Phone, ShieldAlert, Siren, Waves } from "lucide-react";
import { ComingSoonHero, PreviewCard } from "@/components/dashboard/coming-soon";
import { Card } from "@/components/ui/primitives";
import { activeAlerts } from "@/lib/repo/safety";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Safety & Alerts" };
export const dynamic = "force-dynamic";

const LEVEL = { info: "bg-sky-50 text-sky-800 ring-sky-200", warning: "bg-ochre-50 text-ochre-700 ring-ochre-200", critical: "bg-maasai-50 text-maasai-700 ring-maasai-200" } as Record<string, string>;

/** Kenya's national emergency lines (999 and 112 work from any phone). */
const EMERGENCY = [
  { label: "Police, fire & ambulance", number: "999" },
  { label: "Emergency (any network)", number: "112" },
  { label: "Tourist police / KWS rangers", number: "Ask your lodge or guide" },
];

export default async function SafetyPage() {
  const alerts = await activeAlerts();
  return (
    <ComingSoonHero
      eyebrow="Safety & alerts"
      title="Travel with peace of mind"
      text="Live advisories for your route, road and weather alerts, park closures and a one-tap SOS that shares your location with your guide and embassy."
      icon={ShieldAlert}
      tone="bg-maasai-500"
    >
      {alerts.length > 0 && (
        <section className="mt-6 space-y-3" aria-label="Current travel alerts">
          {alerts.map((a) => (
            <div key={a.id} className={cn("rounded-2xl p-4 ring-1", LEVEL[a.level] ?? LEVEL.info)}>
              <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold">
                <ShieldAlert className="h-4 w-4" /> {a.title}
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">{a.region}</span>
              </p>
              <p className="mt-1 text-sm">{a.body}</p>
            </div>
          ))}
        </section>
      )}
      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Phone className="h-5 w-5 text-maasai-500" /> Emergency numbers in Kenya
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {EMERGENCY.map((e) => (
            <li key={e.label} className="rounded-2xl bg-maasai-50 p-4">
              <p className="text-xs text-maasai-600">{e.label}</p>
              {/^\d+$/.test(e.number) ? (
                <a href={`tel:${e.number}`} className="font-display text-2xl font-bold text-ink">
                  {e.number}
                </a>
              ) : (
                <p className="font-display text-base font-semibold">{e.number}</p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">Always check your own government&apos;s travel advice for Kenya before you go.</p>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewCard icon={Siren} title="One-tap SOS" text="Share live location with your guide, lodge and embassy." />
        <PreviewCard icon={CloudRain} title="Weather & road alerts" text="Long-rains flooding and road closures along your route." />
        <PreviewCard icon={Waves} title="Park & beach notices" text="Closures, tides and marine-park conditions." />
        <PreviewCard icon={HeartPulse} title="Health & clinics" text="Nearest hospitals and pharmacies to each stop." />
      </div>
      <Card className="mt-6 flex items-center gap-4 p-5">
        <MapPin className="h-6 w-6 shrink-0 text-savanna-600" />
        <p className="text-sm text-ink-soft">Alerts will be matched to the stops in your saved trips — no setup needed.</p>
      </Card>
    </ComingSoonHero>
  );
}
