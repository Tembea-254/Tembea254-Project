import type { Metadata } from "next";
import { TripView } from "@/components/planner/trip-view";

export const metadata: Metadata = { title: "Your trip" };

export default function TripPage({ params }: { params: { id: string } }) {
  return <TripView id={params.id} />;
}
