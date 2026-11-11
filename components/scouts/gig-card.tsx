import Link from "next/link";
import { CalendarClock, Clock, MapPin, Radio, Users, Video, View } from "lucide-react";
import { mediaSrc } from "@/components/admin/kit";
import { getVR } from "@/lib/data/vr";
import { PLACE_BY_ID } from "@/lib/data/places";
import { GIG_KIND_LABEL, type Gig } from "@/lib/repo/scouts";
import { cn } from "@/lib/utils";

export const placeName = (slug: string) => getVR(slug)?.name ?? PLACE_BY_ID[slug]?.name ?? slug.replace(/-/g, " ");
export const KIND_ICON = { record: Video, record360: View, live: Radio, photos: Video } as const;

const dayFmt = (d: Date) => d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });

/** One job on the Scouts board. The pay is the headline: that's what young people scan for. */
export function GigCard({ gig, left, href, compact }: { gig: Gig; left?: number; href?: string; compact?: boolean }) {
  const Icon = KIND_ICON[gig.kind] ?? Video;
  const body = (
    <article className={cn("group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow", href && "hover:shadow-lift")}>
      <div className="relative aspect-[16/9] overflow-hidden bg-sand-100">
        {gig.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(gig.cover, 640, 360)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 font-display text-xs font-semibold text-white backdrop-blur">
          <Icon className="h-3.5 w-3.5" /> {GIG_KIND_LABEL[gig.kind] ?? gig.kind}
        </span>
        <span className="absolute bottom-3 right-3 rounded-2xl bg-ochre-400 px-3 py-1.5 font-display text-sm font-bold text-ink shadow-lift">Earn KES {gig.payKes.toLocaleString("en-KE")}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-bold leading-snug">{gig.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{gig.spot ? `${gig.spot}, ` : ""}{placeName(gig.destination)}</span>
        </p>
        {!compact && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1">
              <Clock className="h-3 w-3" /> {gig.kind === "live" ? `${gig.minMinutes} min live` : `Record ${gig.minMinutes}+ min`}
            </span>
            {gig.scheduledAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-dusk-50 px-2.5 py-1 text-dusk-500">
                <CalendarClock className="h-3 w-3" /> {dayFmt(gig.scheduledAt)}
              </span>
            ) : gig.deadline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1">
                <CalendarClock className="h-3 w-3" /> By {dayFmt(gig.deadline)}
              </span>
            ) : null}
            {left != null && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", left ? "bg-savanna-50 text-savanna-700" : "bg-maasai-50 text-maasai-600")}>
                <Users className="h-3 w-3" /> {left ? `${left} spot${left > 1 ? "s" : ""} left` : "Full"}
              </span>
            )}
          </div>
        )}
        {gig.rewardTokens > 0 && <p className="mt-auto pt-3 text-xs text-ink-muted">Plus {gig.rewardTokens} Tembea tokens</p>}
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
