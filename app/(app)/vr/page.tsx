import type { Metadata } from "next";
import { VRBrowser } from "@/components/vr/vr-browser";
import { getVrDestinations } from "@/lib/repo/vr";
import { upcomingLiveWalks } from "@/lib/repo/live";

export const metadata: Metadata = { title: "VR Experiences" };
export const dynamic = "force-dynamic";

export default async function VRPage() {
  const [destinations, live] = await Promise.all([getVrDestinations(), upcomingLiveWalks()]);
  return <VRBrowser destinations={destinations} live={live} />;
}
