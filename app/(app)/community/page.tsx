import type { Metadata } from "next";
import { CommunityHub } from "@/components/community/hub";
import { activeStories, suggestedPeople, trendingTags } from "@/lib/repo/community";
import { upcomingLiveWalks } from "@/lib/repo/live";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Community" };
export const dynamic = "force-dynamic";

const TABS = ["foryou", "reels", "following", "explore"] as const;

export default async function CommunityPage({ searchParams }: { searchParams: { tab?: string; tag?: string } }) {
  const me = await currentUser();
  const [stories, live, trending, people] = await Promise.all([activeStories(me?.id ?? null), upcomingLiveWalks(), trendingTags(12), suggestedPeople(me?.id ?? null, 6)]);
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as (typeof TABS)[number]) : "foryou";
  const tag = searchParams.tag?.toLowerCase().replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 40) || undefined;
  return (
    <div className="container-page py-5 sm:py-8">
      <CommunityHub
        me={me ? { name: me.name || "You", image: me.image, handle: me.handle } : null}
        stories={stories}
        live={live.map((l) => ({ id: l.id, title: l.title, host: l.host, scheduledAt: l.scheduledAt, status: l.status, destination: l.destination }))}
        trending={trending}
        people={people}
        initialTab={tab}
        tag={tag}
      />
    </div>
  );
}
