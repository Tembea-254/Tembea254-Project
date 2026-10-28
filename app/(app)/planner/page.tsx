import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannerHome } from "@/components/planner/planner-home";

export const metadata: Metadata = { title: "AI Trip Planner" };

export default function PlannerPage() {
  return (
    <Suspense>
      <PlannerHome />
    </Suspense>
  );
}
