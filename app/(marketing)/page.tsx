import type { Metadata } from "next";
import { Suspense } from "react";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Tembea254 — Free AI travel planner for Kenya",
  description: "Describe your dream Kenya trip and get a full day-by-day itinerary, then walk every stop in 360° before you go.",
};

export default function LandingPage() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
