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

Set `NEXT_PUBLIC_DEMO_LOGIN=false` to hide the demo account.

## Database and admin

Everything (users, trips, VR scenes, community, shop, payments, settings) lives in Postgres through Drizzle (`lib/db/schema.ts`).

- **Locally** nothing to set up: an embedded Postgres (PGlite) is created in `.data/pglite` on first run, migrated and seeded. Delete that folder to start fresh.
- **On Vercel** add a Neon Postgres database (Vercel → Storage → Neon). It sets `DATABASE_URL`; tables and seed data are created on the first request.
- **Uploads** (product photos, community videos, creator videos): add Vercel Blob (Storage → Blob) which sets `BLOB_READ_WRITE_TOKEN`. Locally files go to `public/uploads`.
- **Admins**: `ADMIN_EMAILS` (comma-separated, default `piusdenistech@gmail.com`) become admins when they sign in; admins can promote others in **Admin → Users**.
- After changing `lib/db/schema.ts`, run `npx drizzle-kit generate --name <change>` and commit the new file in `drizzle/`.

### Workspaces
| Who | Route | What they do |
| --- | --- | --- |
| Admin | `/admin` | Control centre: overview, users & roles, trips, VR scenes, creators & live walks, shop & vendors, hire marketplace, payments & payouts, community, reviews, blog, translator, safety alerts, settings (commission, delivery fee, rewards, announcement banner), activity log |
| Vendor | `/vendor` | Apply with ID + KRA PIN, add products, ship orders, see earnings after Tembea's commission, request M-Pesa payouts |
| Creator | `/creators` | Sell walk/drive/air/water videos to Tembea (cash and tokens), host live virtual walks for tokens |
| Buyer | `/marketplace`, `/checkout`, `/orders` | Shop verified makers, pay by M-Pesa, track and confirm delivery |

**Money flow**: the buyer pays Tembea → each item's commission (vendor rate, else category rate, else default) is kept → the vendor's share becomes withdrawable once the item is delivered → the vendor requests a payout → an admin approves and marks it paid with the M-Pesa reference.

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
| Marketplace | `/marketplace` | Shop Kenyan-made goods from verified vendors, or hire drivers, guides, photographers and artists |
| Safety & Alerts | `/safety` | Emergency numbers and live alerts posted by admins |
| Profile | `/profile` | Name, currency, language, Premium demo toggle, export or delete data |

## Community, marketplace and payments

- **Community** (`/community`): photo and video posts (several per post), likes, comments, saves, reports, and sharing to WhatsApp, X, Facebook, TikTok and Instagram (phone share sheet, or the media is saved and the caption copied). Reviews earn tokens once an admin approves them.
- **Marketplace** (`/marketplace`): the **Shop** tab lists verified vendor stores and products; the **Hire** tab books drivers, photographers, artists and guides by area, with a 30% M-Pesa deposit.
- **M-Pesa deposits**: add the `MPESA_*` keys from `.env.example` to send a real Lipa na M-Pesa STK push (Daraja) for shop orders and hire deposits. Without them it runs in demo mode and no money moves. Prices are recalculated on the server; Safaricom's callback (`/api/mpesa/callback`) marks deposits paid.
- **VR modes**: every scene is tagged by how the camera really moves — Fly, Walk, Drive, or Look Around (camera standing still). See the comment above `MODES` in `lib/data/vr.ts`.
- **Voice navigation**: open the accessibility button (or press Alt + V), tap "Start voice navigation", then just talk. Commands are parsed in `components/a11y/voice-commands.ts`.

### Before going live

- Replace the placeholder social handles and email in `lib/site.ts`.
- Connect Neon Postgres and Vercel Blob (see above) and add the `MPESA_*` keys.
- Hotel stars are property class, not guest scores; hotel, tour and transport prices are indicative.

## Architecture

```
app/                  routes (App Router): (marketing), (app), admin, api
  lib/db/             Drizzle schema, migrations runner, seed
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

Trips are cached in the browser (`lib/hooks/store.ts`) and synced to the database for signed-in users.

## Content sources
- Photos: Unsplash (free licence). IDs are in `lib/data/images.ts`.
- VR footage: YouTube creators, embedded via `youtube-nocookie.com` and credited in every scene. All were checked as embeddable on 2026-10-27.
- Prices are indicative 2026 planning estimates, not quotes.
- Local-language phrases are a starter set. Have native speakers review them before launch.
- Map tiles: © OpenStreetMap contributors, © CARTO.
