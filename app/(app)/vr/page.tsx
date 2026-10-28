import type { Metadata } from "next";
import { VRBrowser } from "@/components/vr/vr-browser";

export const metadata: Metadata = { title: "VR Experiences" };

export default function VRPage() {
  return <VRBrowser />;
}
