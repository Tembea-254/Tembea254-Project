"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/** While an order waits for M-Pesa, refresh the page every few seconds until it settles. */
export function OrderPoller({ waiting }: { waiting: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => router.refresh(), 4000);
    const stop = setTimeout(() => clearInterval(t), 120_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [waiting, router]);
  if (!waiting) return null;
  return (
    <p className="mt-3 flex items-center gap-2 rounded-2xl bg-ochre-50 p-3 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Check your phone and enter your M-Pesa PIN. This page updates on its own.
    </p>
  );
}
