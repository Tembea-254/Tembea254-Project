import type { Config } from "tailwindcss";

/**
 * Design language adapted from Stippl (generous whitespace, Poppins headings,
 * Rubik body, pill CTAs, 16–24px rounded cards) re-coloured with Kenyan accents:
 * forest ink, savanna green, Maasai red, earth ochre and sand.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0E2E24", soft: "#3D5A50", muted: "#6B8178" },
        savanna: { 50: "#ECFBF3", 100: "#CFF5E0", 200: "#A2EAC4", 400: "#2FC57A", 500: "#14A85F", 600: "#0E8A4D", 700: "#0B6B3D" },
        maasai: { 50: "#FDEDEE", 100: "#FAD3D6", 500: "#C8102E", 600: "#A50D26" },
        ochre: { 50: "#FFF6E5", 100: "#FDE7BD", 400: "#F2B13A", 500: "#D98E04", 600: "#B37503" },
        sand: { 50: "#FBF8F2", 100: "#F6F1E7", 200: "#ECE3D2" },
        dusk: { 500: "#5B3FD1", 50: "#F1EDFF" },
        night: "#0A1512",
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Rubik", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        card: "0 1px 2px rgba(14,46,36,0.04), 0 8px 24px -12px rgba(14,46,36,0.12)",
        lift: "0 2px 4px rgba(14,46,36,0.06), 0 18px 40px -16px rgba(14,46,36,0.25)",
        glow: "0 10px 30px -10px rgba(20,168,95,0.55)",
      },
      backgroundImage: {
        "kenya-stripe":
          "linear-gradient(90deg,#0E2E24 0 25%,#C8102E 25% 50%,#14A85F 50% 75%,#F2B13A 75% 100%)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
