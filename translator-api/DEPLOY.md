# Deploy runbook: translation service

Goal: the service is always on, restarts itself, and the Tembea app keeps working even while it is down.
Untested on my side: the Docker build and any specific host. Treat provider details as things to confirm on their pages.

## 0. Before you start
- [ ] `translator-api/models/luo_lora/` and `translator-api/models/dav_lora/` copied from Google Drive
- [ ] A long random key: `openssl rand -hex 24` (this is `NLLB_SERVICE_KEY`)
- [ ] A host with at least 4 GB RAM (my estimate for the 600M model in fp32 plus the adapters; confirm on your host)

## 1. Pick a host (any one of these)
| Route | Good for | Watch out for |
|---|---|---|
| **A VPS with Docker** | Full control, truly always on, simplest restart story | You maintain the server and its updates |
| **Managed container host** (Render, Railway, Fly.io and similar) | No server upkeep, built-in restart on failure | Free or small plans may sleep idle services or cap memory below 4 GB: pick an always-on plan |
| **Hugging Face Docker Space** | Close to where the model lives | Free hardware may sleep and has little RAM; check the current limits |

## 2. Settings the host needs, whichever you pick
- Build from `translator-api/` using the `Dockerfile` (port **8000**)
- Environment variable `NLLB_SERVICE_KEY` = your key
- Health check path **`/health`** (liveness). Do not use `/ready` for restarts: loading takes a while
- Restart policy: on failure / always
- Instances: **1 always running** (the service handles one translation at a time by design)
- Memory: 4 GB or more

VPS quick start:
```bash
cd translator-api && cp .env.example .env   # put your key in .env
docker compose up -d --build
docker compose logs -f                      # wait for "engine ready"
```

## 3. Check it from your laptop
```bash
NLLB_SERVICE_URL=https://your-service-url NLLB_SERVICE_KEY=... GOOGLE_TRANSLATE_API_KEY=... \
  node scripts/check-translator.mjs
```
It tests health, readiness, five sample translations with timings, and your Google key, and it suggests a value for
`NLLB_TIMEOUT_MS`. Fix every FAIL line before continuing. The first call after a start is the slowest, so run it twice.

## 4. Connect the app (Vercel, then redeploy)
`NLLB_SERVICE_URL`, `NLLB_SERVICE_KEY`, `NLLB_TIMEOUT_MS`, `GOOGLE_TRANSLATE_API_KEY`.

## 5. Monitor (so nobody has to notice an outage)
Point an uptime monitor (UptimeRobot, Better Stack or similar) at `https://your-service-url/ready` every 5 minutes with an
email or SMS alert. This also keeps idle-sleeping hosts awake.

## 6. If something breaks
| Symptom | Likely cause | What to do |
|---|---|---|
| App shows "engine is waking up or offline" | Service down, restarting or asleep | Check `/health`; the app recovers by itself about 30 s after the service answers |
| `/ready` stays 503 | Models still loading, or the adapter folders are missing | Read the service logs; check `models/dav_lora` exists |
| Taita requests fail with 503 | `dav_lora` not found | Taita refuses to run without its adapter on purpose |
| 401 from the service | Key differs between the host and Vercel | Set the same `NLLB_SERVICE_KEY` in both |
| Everything slow | Host too small, or CPU only | Run the check script and compare timings; try more RAM/CPU or a GPU host |
| Need to switch the engine off | | Remove `NLLB_SERVICE_URL` in Vercel: the app goes back to phrasebook + MyMemory |
