"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { waLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "../brand/social-icons";
import { AccessibilityHelper } from "./accessibility";

const APP_ROUTES = /^\/(dashboard|vr|planner|translator|marketplace|community|safety|profile)/;

/** Floating WhatsApp contact + accessibility helper, on every page. */
export function FloatingDock() {
  const pathname = usePathname();
  const immersive = /^\/vr\/[^/]+/.test(pathname);
  const inApp = APP_ROUTES.test(pathname);
  // screens with their own floating actions or sticky buy bars
  const busy = /^\/(community|checkout|orders|translator|marketplace\/(product|store))/.test(pathname);
  useEffect(() => {
    document.documentElement.classList.toggle("tm-dock-tucked", busy);
    return () => document.documentElement.classList.remove("tm-dock-tucked");
  }, [busy]);

  // On phones the buttons slide out of the way while you scroll down, and come back when you
  // scroll up or stop scrolling — so they never sit on top of what you're reading.
  useEffect(() => {
    const h = document.documentElement;
    let last = window.scrollY;
    let idle = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (window.innerWidth < 1024 && y > last + 4 && y > 120) h.classList.add("tm-dock-hidden");
      else if (y < last - 4) h.classList.remove("tm-dock-hidden");
      last = y;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => h.classList.remove("tm-dock-hidden"), 1200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
      h.classList.remove("tm-dock-hidden");
    };
  }, []);
  return (
    <div className={cn("fixed right-3 z-[80] flex flex-col items-end gap-2.5 sm:right-6 sm:gap-3", immersive ? "bottom-36 sm:bottom-40" : inApp ? "bottom-28 lg:bottom-6" : "bottom-5 sm:bottom-6")}>
      {!immersive && (
        <motion.a
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.8 }}
          className="tm-fab group relative grid h-12 w-12 place-items-center rounded-full bg-[#25D366] sm:h-14 sm:w-14 text-white shadow-lift ring-4 ring-white/70 transition-transform hover:scale-105"
          aria-label="Chat with Tembea254 on WhatsApp"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" />
          <WhatsAppIcon className="relative h-6 w-6 sm:h-7 sm:w-7" />
        </motion.a>
      )}
      <AccessibilityHelper />
    </div>
  );
}
