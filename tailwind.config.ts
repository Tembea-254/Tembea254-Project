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
        maasai: { 50: "#FDEDEE", 100: "#FAD3D6", 200: "#F4A9B3", 300: "#EA7C8C", 500: "#C8102E", 600: "#A50D26", 700: "#820A1E" },
        ochre: { 50: "#FFF6E5", 100: "#FDE7BD", 200: "#F9D184", 400: "#F2B13A", 500: "#D98E04", 600: "#B37503", 700: "#8A5A02" },
        sand: { 50: "#FBF8F2", 100: "#F6F1E7", 200: "#ECE3D2" },
        dusk: { 500: "#5B3FD1", 50: "#F1EDFF", 100: "#E1D9FF", 700: "#3F2A9E" },
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
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        bump: { "0%,100%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" } },
        heart: { "0%": { transform: "scale(0)", opacity: "0" }, "15%": { transform: "scale(1.2)", opacity: "1" }, "30%": { transform: "scale(0.95)" }, "45%,80%": { transform: "scale(1)", opacity: "1" }, "100%": { transform: "scale(1.4) translateY(-30px)", opacity: "0" } },
        rise: { "0%": { transform: "translateY(12px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        kenburns: { "0%": { transform: "scale(1) translate(0,0)" }, "100%": { transform: "scale(1.12) translate(-2%,-2%)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        bump: "bump 0.45s ease-out",
        heart: "heart 0.9s ease-out forwards",
        rise: "rise 0.5s ease-out both",
        kenburns: "kenburns 9s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
