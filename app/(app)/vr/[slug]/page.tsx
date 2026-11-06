import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VRPlayer } from "@/components/vr/vr-player";
import { getVrDestination } from "@/lib/repo/vr";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await getVrDestination(params.slug);
  return { title: d ? `${d.name} — Virtual preview` : "Virtual preview" };
}

export default async function VRDestinationPage({ params }: { params: { slug: string } }) {
  const d = await getVrDestination(params.slug);
  if (!d) notFound();
  return (
    <Suspense>
      <VRPlayer destination={d} />
    </Suspense>
  );
}
