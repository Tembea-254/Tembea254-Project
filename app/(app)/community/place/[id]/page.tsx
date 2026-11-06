import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Glasses, Route, ShoppingBag } from "lucide-react";
import { PlaceFeed } from "@/components/community/place-feed";
import { mediaUrl } from "@/components/shop/media";
import { PLACE_BY_ID } from "@/lib/data/places";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }) {
  return { title: PLACE_BY_ID[params.id]?.name ?? "Place" };
}

export default function PlacePage({ params }: { params: { id: string } }) {
  const p = PLACE_BY_ID[params.id];
  if (!p) notFound();
  return (
    <div className="container-page max-w-[1080px] py-5 sm:py-8">
      <Link href="/community?tab=explore" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Explore
      </Link>
      <header className="relative overflow-hidden rounded-[1.75rem] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(p.image, 1400, 600)} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-ochre-200">{p.region}</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{p.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/planner" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-display text-sm font-semibold text-ink">
              <Route className="h-4 w-4" /> Plan a trip here
            </Link>
            <Link href="/vr" className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 font-display text-sm font-semibold ring-1 ring-white/30 backdrop-blur">
              <Glasses className="h-4 w-4" /> Preview in 360°
            </Link>
            <Link href="/marketplace?type=service" className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 font-display text-sm font-semibold ring-1 ring-white/30 backdrop-blur">
              <ShoppingBag className="h-4 w-4" /> Guides & drivers
            </Link>
          </div>
        </div>
      </header>
      <PlaceFeed placeId={p.id} />
    </div>
  );
}
