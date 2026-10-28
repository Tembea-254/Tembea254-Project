import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VR_DESTINATIONS, getVR } from "@/lib/data/vr";
import { VRPlayer } from "@/components/vr/vr-player";

export function generateStaticParams() {
  return VR_DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const d = getVR(params.slug);
  return { title: d ? `${d.name} — Virtual preview` : "Virtual preview" };
}

export default function VRDestinationPage({ params }: { params: { slug: string } }) {
  const d = getVR(params.slug);
  if (!d) notFound();
  return (
    <Suspense>
      <VRPlayer slug={d.slug} />
    </Suspense>
  );
}
