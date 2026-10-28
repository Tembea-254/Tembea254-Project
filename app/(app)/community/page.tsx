import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/community-feed";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <CommunityFeed />
    </div>
  );
}
