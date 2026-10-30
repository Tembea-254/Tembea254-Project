import Link from "next/link";
import { ArrowRight, BadgeCheck, Clapperboard, ClipboardList, Clock, Hourglass, LayoutPanelLeft, MessageCircleQuestion, Store } from "lucide-react";
import { IMG } from "@/lib/data/images";
import { cn } from "@/lib/utils";
import { mediaUrl } from "./media";

/* "Earn with Tembea254": the two questions on the marketplace that lead to the seller and creator applications. */

export interface JoinState {
  seller: "none" | "pending" | "verified" | "suspended" | "rejected";
  creator: "none" | "pending" | "approved" | "rejected";
}

type Cta = { label: string; href: string; tone: "go" | "wait" | "open" | "retry"; status?: string };

export function sellerCta(st: JoinState["seller"]): Cta {
  if (st === "verified" || st === "suspended") return { label: "Open seller centre", href: "/vendor", tone: "open", status: st === "verified" ? "You're a verified seller" : "Store paused" };
  if (st === "pending") return { label: "View my application", href: "/marketplace/join/seller", tone: "wait", status: "Application in review" };
  if (st === "rejected") return { label: "Update and send again", href: "/marketplace/join/seller", tone: "retry", status: "Not approved yet" };
  return { label: "Yes, I'd like to sell", href: "/marketplace/join/seller", tone: "go" };
}
export function creatorCta(st: JoinState["creator"]): Cta {
  if (st === "approved") return { label: "Open creator studio", href: "/creators", tone: "open", status: "You're a Tembea254 creator" };
  if (st === "pending") return { label: "View my application", href: "/marketplace/join/creator", tone: "wait", status: "Application in review" };
  if (st === "rejected") return { label: "Update and send again", href: "/marketplace/join/creator", tone: "retry", status: "Not approved yet" };
  return { label: "Yes, I'd like to create", href: "/marketplace/join/creator", tone: "go" };
}

const ctaCls: Record<Cta["tone"], string> = {
  go: "bg-ochre-400 text-ink hover:bg-ochre-200",
  wait: "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/20",
  open: "bg-savanna-500 text-white hover:bg-savanna-600",
  retry: "bg-white text-ink hover:bg-sand-50",
};

function QuestionCard({ img, icon: Icon, kicker, question, text, points, cta }: { img: string; icon: typeof Store; kicker: string; question: string; text: string; points: string[]; cta: Cta }) {
  return (
    <article className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-ink text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(img, 900, 700)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/10" />
      <div className="relative p-5 sm:p-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-ochre-200 backdrop-blur">
          <Icon className="h-3.5 w-3.5" /> {kicker}
        </span>
        <h3 className="mt-3 flex items-start gap-2 text-2xl font-bold text-white sm:text-[1.7rem]">
          <MessageCircleQuestion className="mt-1 h-6 w-6 shrink-0 text-ochre-400" aria-hidden />
          {question}
        </h3>
        <p className="mt-2 max-w-md text-sm text-white/80">{text}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {points.map((p) => (
            <li key={p} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85">
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={cta.href} className={cn("inline-flex h-12 items-center gap-2 rounded-full px-6 font-display text-sm font-semibold transition-colors", ctaCls[cta.tone])}>
            {cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
          {cta.status && (
            <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
              {cta.tone === "wait" ? <Hourglass className="h-4 w-4 text-ochre-200" /> : <BadgeCheck className="h-4 w-4 text-savanna-200" />} {cta.status}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

const STEPS = [
  { icon: MessageCircleQuestion, t: "Say yes", d: "Pick sell, create, or both" },
  { icon: ClipboardList, t: "Fill a short form", d: "About 3 minutes" },
  { icon: Clock, t: "We review it", d: "Usually within 2 working days" },
  { icon: LayoutPanelLeft, t: "Your workspace opens", d: "It appears in your sidebar" },
];

/** The full invitation: two question cards and how it works. */
export function EarnInvite({ state, id = "earn", heading = true }: { state: JoinState; id?: string; heading?: boolean }) {
  return (
    <section id={id} className="scroll-mt-24">
      {heading && (
        <div className="mb-4">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-savanna-600">Earn with Tembea254</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Turn what you make, do or film into income</h2>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <QuestionCard
          img={IMG.maasaiWomen}
          icon={Store}
          kicker="Sell on Tembea254"
          question="Would you like to sell on Tembea254?"
          text="Makers sell beadwork, kiondo, carvings and other Kenyan-made goods. Drivers, guides, photographers and artists sell their services to travellers."
          points={["Free to join", "Paid to M-Pesa", "Verified seller badge"]}
          cta={sellerCta(state.seller)}
        />
        <QuestionCard
          img={IMG.maraBalloon}
          icon={Clapperboard}
          kicker="Tembea254 creators"
          question="Would you like to be a Tembea254 creator?"
          text="Film walks, game drives, drone flights and boat rides. We buy the best clips for our 360° pre-visits, and you can host live walks for travellers."
          points={["Cash or tokens", "Your name on every clip", "Host live walks"]}
          cta={creatorCta(state.creator)}
        />
      </div>
      <ol className="mt-4 grid gap-2 rounded-3xl bg-white p-3 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex items-center gap-3 rounded-2xl p-2">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-savanna-50 text-savanna-700">
              <s.icon className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink font-display text-[10px] font-bold text-white">{i + 1}</span>
            </span>
            <span>
              <span className="block font-display text-sm font-semibold">{s.t}</span>
              <span className="text-xs text-ink-muted">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A slim question bar for the top of the marketplace that scrolls to the full invitation. */
export function EarnPrompt({ state }: { state: JoinState }) {
  const s = sellerCta(state.seller);
  const c = creatorCta(state.creator);
  if (s.tone === "open" && c.tone === "open") return null;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-ochre-50 p-3 ring-1 ring-ochre-200/60 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
        <MessageCircleQuestion className="h-5 w-5 shrink-0 text-ochre-600" /> Earn with Tembea254 — which describes you?
      </p>
      <div className="flex flex-wrap gap-2">
        {s.tone !== "open" && (
          <Link href={s.href} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-display text-sm font-semibold shadow-card hover:bg-sand-50">
            <Store className="h-4 w-4 text-savanna-600" /> {s.tone === "go" ? "I'd like to sell" : s.status}
          </Link>
        )}
        {c.tone !== "open" && (
          <Link href={c.href} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-display text-sm font-semibold shadow-card hover:bg-sand-50">
            <Clapperboard className="h-4 w-4 text-dusk-500" /> {c.tone === "go" ? "I'd like to create videos" : c.status}
          </Link>
        )}
      </div>
    </div>
  );
}
