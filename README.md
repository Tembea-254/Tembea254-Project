# Tembea254 — Discover Kenya

Premium Kenyan tourism PWA: an AI trip planner (inspired by Stippl), immersive virtual pre-visits (inspired by CityWalks) and a multilingual translator.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. You land on the public landing page; every "try it" button opens the sign-in popup, and signing in takes you to the dashboard.

`.env.local` is already created with a random `NEXTAUTH_SECRET`, so **email sign-up and the demo account work immediately**.

### Turn on "Continue with Google"
1. Go to https://console.cloud.google.com → create a project → **APIs & Services → OAuth consent screen** (External, add your email).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google` (add your live domain later).
4. Paste the client ID and secret into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart `npm run dev`.

### Turn on "Continue with Facebook"
1. Go to https://developers.facebook.com → **My Apps → Create app** → choose *Authenticate and request data from users with Facebook Login*.
2. **Facebook Login → Settings**: add `http://localhost:3000/api/auth/callback/facebook` as a valid OAuth redirect URI.
3. Copy the App ID and App Secret into `.env.local` as `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`, then restart.

Email accounts are stored in `.data/users.json` (hashed passwords) for local use — move to a real database before launch. Set `NEXT_PUBLIC_DEMO_LOGIN=false` to hide the demo account.

### Your own 360° footage
Drop equirectangular MP4s (Insta360 / Osmo 360 exports) or 360° photos into `public/vr/` and add a scene with `source: { kind: "video", src: "/vr/your-file.mp4" }` in `lib/data/vr.ts`. They play in Tembea's own WebGL viewer with the same drag / scroll / tilt / auto-pan controls.

## What's inside

| Tab | Route | Notes |
| --- | --- | --- |
| Landing (public) | `/` | Stippl-style marketing page with feature showcases; every action asks you to sign in |
| Dashboard | `/dashboard` | Greeting, stats, next trip, quick actions, featured VR, recent activity |
| VR Experiences | `/vr`, `/vr/[slug]` | 13 destinations, 45 real 360° spots (4K/8K). Autoplay, no player controls; look around by drag, scroll wheel, arrow keys or phone tilt; idle auto-pan; walk between spots; day/night; 45-second premium teaser |
| AI Trip Planner | `/planner`, `/planner/[id]` | Prompt → route, stays, day-by-day plan. Editable timeline (drag, edit, move between days), map, budget and settle-up, packing list, notes. Destination photo galleries and 360° preview links on every stop. Exports: photo PDF (with 360° QR codes), WhatsApp share, .ics, text, JSON |
| Translator | `/translator` | Real-time machine translation (MyMemory) for Swahili and world languages, a phrasebook for Kikuyu, Luo, Maa and Kalenjin, voice in/out, conversation mode, history |
| Marketplace | `/marketplace` | Placeholder |
| Safety & Alerts | `/safety` | Placeholder with live emergency numbers |
| Profile | `/profile` | Name, currency, language, Premium demo toggle, export or delete data |

## Architecture

```
app/                  routes (App Router) + /api/plan
components/
  shell/              sidebar, mobile nav, logo, PWA registration
  ui/                 button + primitives (shadcn-style, CVA + tailwind-merge)
  dashboard/ vr/ planner/ translator/
lib/
  data/               places (planner knowledge base), vr (scenes), languages + phrasebook, images
  planner/            types + engine (parse → choose → order → allocate → days → budget → packing)
  hooks/store.ts      localStorage store (swap for your backend later)
  translate.ts        phrasebook-first, MT fallback
public/               manifest, icon, service worker
```

All persistence goes through `lib/hooks/store.ts`, so moving to Supabase or Firebase means changing one file.

## Content sources
- Photos: Unsplash (free licence). IDs are in `lib/data/images.ts`.
- VR footage: YouTube creators, embedded via `youtube-nocookie.com` and credited in every scene. All were checked as embeddable on 2026-10-27.
- Prices are indicative 2026 planning estimates, not quotes.
- Local-language phrases are a starter set. Have native speakers review them before launch.
- Map tiles: © OpenStreetMap contributors, © CARTO.
