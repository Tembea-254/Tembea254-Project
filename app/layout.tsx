import type { Metadata, Viewport } from "next";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { PWARegister } from "@/components/shell/pwa-register";
import { FloatingDock } from "@/components/a11y/floating-dock";

export const metadata: Metadata = {
  title: { default: "Tembea254 — Discover Kenya", template: "%s · Tembea254" },
  description: "Plan Kenyan trips with AI, preview destinations in immersive virtual walks and talk to locals in their language.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Tembea254", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0E2E24",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <FloatingDock />
        </AuthProvider>
        <PWARegister />
      </body>
    </html>
  );
}
