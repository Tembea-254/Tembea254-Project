/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Tembea254 brand assets (public/brand):
 *  - logo.png / logo-light.png   full wordmark, for light / dark backgrounds
 *  - logo-round*.png             circular "T" badge, for icon-sized spots
 *  - logo-round-full*.png        circular badge with the full wordmark (social avatars)
 */

/** Circular brand badge — the Tembea "T" with its paper plane, in a green ring. */
export function LogoMark({ className, dark }: { className?: string; dark?: boolean }) {
  return <img src={dark ? "/brand/logo-round-dark.png" : "/brand/logo-round.png"} alt="Tembea254" width={512} height={512} className={cn("h-9 w-9 shrink-0 rounded-full", className)} />;
}

/** Full Tembea254 wordmark. `light` = white lettering for dark backgrounds. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <img
      src={light ? "/brand/logo-light.png" : "/brand/logo.png"}
      alt="Tembea254"
      width={1200}
      height={302}
      className={cn("h-9 w-auto max-w-none select-none sm:h-10", className)}
      draggable={false}
    />
  );
}
