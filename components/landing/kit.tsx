"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLoginGate } from "../auth/auth-provider";

/** Fade-and-rise on scroll, like Stippl's section entrances. */
export function Reveal({ className, delay = 0, y = 28, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    />
  );
}

/**
 * Everything on the landing page is a showcase. Any "try it" action routes through here:
 * signed-in users go straight to the feature, everyone else gets the sign-in modal first.
 */
export function useTry() {
  const { status } = useSession();
  const router = useRouter();
  const { openLogin } = useLoginGate();
  return useCallback(
    (href: string, reason?: string) => {
      if (status === "authenticated") router.push(href);
      else openLogin({ callbackUrl: href, reason });
    },
    [status, router, openLogin],
  );
}

export function Phone({ children, className, tilt = 0 }: { children: React.ReactNode; className?: string; tilt?: number }) {
  return (
    <div
      className={cn("relative w-[270px] rounded-[46px] border-[9px] border-[#0b1f19] bg-white shadow-[0_40px_80px_-30px_rgba(14,46,36,0.55)]", className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0b1f19]" />
      <div className="relative h-[540px] overflow-hidden rounded-[37px]">{children}</div>
    </div>
  );
}

export function IconTile({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
      className={cn("absolute grid h-16 w-16 animate-floaty place-items-center rounded-[20px] border-4 border-white shadow-lift", className)}
      style={{ animationDelay: `${delay * 2}s` }}
    >
      {children}
    </motion.span>
  );
}

/** Stippl's signature hand-drawn underline. */
export function Swoosh({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-savanna-400 sm:-bottom-2 sm:h-4" aria-hidden>
        <motion.path
          d="M3 14 C 50 4, 120 4, 197 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeInOut" }}
        />
      </svg>
    </span>
  );
}
