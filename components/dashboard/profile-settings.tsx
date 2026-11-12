"use client";

import { Check, Crown, Download, Headset, Route, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { LANGUAGES } from "@/lib/data/languages";
import { useActivity, useMounted, useProfile, useTrips } from "@/lib/hooks/store";
import { cn, type Currency } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge, Card, Input, Segmented, Select } from "../ui/primitives";

export function ProfileSettings() {
  const mounted = useMounted();
  const [profile, setProfile] = useProfile();
  const { trips } = useTrips();
  const { log } = useActivity();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(profile);
  // load stored profile into the form once storage is available
  const { data: session } = useSession();
  useEffect(() => {
    if (mounted) setDraft({ ...profile, name: profile.name === "Traveller" && session?.user?.name ? session.user.name : profile.name, email: profile.email || session?.user?.email || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, session?.user?.email]);

  const save = () => {
    setProfile({ ...profile, ...draft, premium: profile.premium });
    log({ kind: "settings", text: "Updated profile settings", href: "/profile" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <p className="eyebrow">Profile & settings</p>
      <h1 className="text-3xl font-bold sm:text-4xl">Your account</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-savanna-100 font-display text-2xl font-bold text-savanna-700">
                {(mounted ? draft.name : "T").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-display text-lg font-semibold">{mounted ? profile.name : "Traveller"}</p>
                <Badge tone={mounted && profile.premium ? "ochre" : "neutral"}>{mounted && profile.premium ? "Premium" : "Free plan"}</Badge>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-ink-muted">
                Display name
                <Input className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="text-xs text-ink-muted">
                Email
                <Input className="mt-1" type="email" placeholder="you@example.com" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </label>
              <label className="text-xs text-ink-muted">
                Home country
                <Input className="mt-1" value={draft.homeCountry} onChange={(e) => setDraft({ ...draft, homeCountry: e.target.value })} />
              </label>
              <label className="text-xs text-ink-muted">
                App language
                <Select className="mt-1" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })}>
                  {LANGUAGES.filter((l) => !l.local).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs text-ink-muted">Show prices in</p>
              <Segmented<Currency>
                value={draft.currency}
                onChange={(v) => setDraft({ ...draft, currency: v })}
                options={(["KES", "USD", "EUR", "GBP"] as Currency[]).map((c) => ({ value: c, label: c }))}
              />
              <p className="mt-2 text-xs text-ink-muted">Conversions use indicative rates for planning.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={save}>
                {saved ? <Check className="h-4 w-4" /> : null} {saved ? "Saved" : "Save changes"}
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold">Your data</h2>
            <p className="text-sm text-ink-muted">Trips, translations and settings are stored on this device. Connect an account later to sync across devices.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const data: Record<string, unknown> = {};
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith("tembea."))
                    .forEach((k) => (data[k] = JSON.parse(localStorage.getItem(k) || "null")));
                  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "tembea254-backup.json";
                  a.click();
                }}
              >
                <Download className="h-4 w-4" /> Export my data
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!window.confirm("Delete all trips, history and settings on this device?")) return;
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith("tembea."))
                    .forEach((k) => localStorage.removeItem(k));
                  window.location.href = "/";
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete everything
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-muted">{mounted ? `${trips.length} saved trip${trips.length === 1 ? "" : "s"} on this device.` : ""}</p>
          </Card>
        </div>

        <Card id="premium" className={cn("h-fit overflow-hidden", mounted && profile.premium ? "ring-2 ring-ochre-400" : "")}>
          <div className="bg-ink p-6 text-white">
            <Crown className="h-8 w-8 text-ochre-400" />
            <h2 className="mt-3 text-2xl font-bold text-white">Tembea Premium</h2>
            <p className="mt-1 text-white/70">Everything you need to go from dreaming to booked.</p>
            <p className="mt-4 font-display text-3xl font-bold text-white">
              KES <PremiumPrice /><span className="text-base font-medium text-white/60"> / month</span>
            </p>
          </div>
          <ul className="space-y-3 p-6 text-sm">
            {[
              { icon: Sparkles, t: "Far fewer ads: about one an hour instead of every 20 seconds" },
              { icon: Headset, t: "Every full-length & 360° VR scene" },
              { icon: Route, t: "No auto-renewal: each payment adds 30 days" },
            ].map((x) => (
              <li key={x.t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ochre-50 text-ochre-600">
                  <x.icon className="h-4 w-4" />
                </span>
                {x.t}
              </li>
            ))}
          </ul>
          <PremiumCheckout onChange={(pro) => setProfile({ ...profile, premium: pro })} log={log} />
        </Card>
      </div>
    </div>
  );
}

type PremiumState = { pro: boolean; until: string | null; priceKes: number };

function usePremiumState() {
  const [st, setSt] = useState<PremiumState | null>(null);
  useEffect(() => {
    fetch("/api/premium")
      .then((r) => r.json())
      .then(setSt)
      .catch(() => {});
  }, []);
  return [st, setSt] as const;
}

function PremiumPrice() {
  const [st] = usePremiumState();
  return <>{st ? st.priceKes.toLocaleString() : "499"}</>;
}

/** Premium is paid by M-Pesa and kept on the account; the server decides ads and unlocks from it. */
function PremiumCheckout({ onChange, log }: { onChange: (pro: boolean) => void; log: (a: { kind: "settings"; text: string; href: string }) => void }) {
  const [st, setSt] = usePremiumState();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (st) onChange(st.pro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.pro]);
  if (!st) return <div className="px-6 pb-6 text-sm text-ink-muted">Checking your plan…</div>;
  if (st.pro)
    return (
      <div className="px-6 pb-6">
        <p className="flex items-center gap-2 rounded-2xl bg-savanna-50 p-3 text-sm font-semibold text-savanna-800">
          <Check className="h-4 w-4" /> Premium is on{st.until ? ` until ${new Date(st.until).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </p>
      </div>
    );
  return (
    <form
      className="space-y-2 px-6 pb-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const r = await fetch("/api/premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Payment could not start");
          setMsg(d.pro ? "Payment received. Premium is on." : d.message || "Check your phone and enter your M-Pesa PIN.");
          if (d.pro) {
            setSt({ ...st, pro: true, until: d.until });
            log({ kind: "settings", text: "Activated Premium", href: "/profile#premium" });
          }
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Payment could not start");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input placeholder="M-Pesa number, e.g. 0712 345 678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="M-Pesa number" />
      <Button type="submit" className="w-full" disabled={busy}>
        <Crown className="h-4 w-4" /> {busy ? "Starting payment…" : `Pay KES ${st.priceKes.toLocaleString()} with M-Pesa`}
      </Button>
      {msg && <p className="text-xs text-ink-muted">{msg}</p>}
    </form>
  );
}
