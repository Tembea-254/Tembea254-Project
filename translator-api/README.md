# Tembea254 translation service

Serves Dholuo and Taita (NLLB-200 + your two LoRA adapters) and backs up the other languages. The Next.js app calls it
server-side through `/api/translate`; the browser never sees the URL or key.

## 1. Put the adapters in place
Copy from Google Drive (`kenya_translator/models/`) into this folder:

```
translator-api/models/luo_lora/   (adapter_config.json, adapter_model.safetensors)
translator-api/models/dav_lora/
```
Taita refuses to answer without its adapter (otherwise it would silently return plain Swahili). Dholuo falls back to the
base NLLB model if its adapter is missing.

## 2. Run it
```bash
cp .env.example .env   # or: export NLLB_SERVICE_KEY=$(openssl rand -hex 24)
docker compose up -d --build
curl localhost:8000/health      # {"status":"ok"} as soon as the process is up
curl localhost:8000/ready       # 200 once the models have loaded (the base model is baked into the image at build time)
curl -X POST localhost:8000/translate -H "content-type: application/json" -H "x-api-key: $NLLB_SERVICE_KEY" \
     -d '{"text":"Where is the toilet?","from":"en","to":"luo"}'
```
Then set `NLLB_SERVICE_URL` and `NLLB_SERVICE_KEY` in the Next.js app's environment (same key).

## 3. Staying up without anyone touching it
- `restart: unless-stopped` restarts the container after a crash or a host reboot. On a managed host, enable its
  restart-on-failure policy (Railway, Render, Fly.io and a plain VPS with Docker all have one).
- A watchdog translates a test sentence every 60 s. If it fails or hangs 3 times in a row the process exits and the
  restart policy brings it back.
- `/health` is liveness (use it for the platform health check), `/ready` is readiness (use it for uptime monitoring).
- Free hosting tiers often put idle services to sleep. That is not a crash, but the first request after sleep waits for
  the model to load. Use an always-on plan, or ping `/ready` every 5 minutes with an uptime monitor. Check your
  provider's current terms, since I haven't verified them.
- If the service is down anyway, the app keeps working: it skips the engine for 30 s after 3 failures, then falls back to
  the phrasebook and the public MyMemory API, and starts using the engine again by itself once it answers.

## 4. Sizing (estimates, not measurements)
The 600M model in fp32 needs roughly 3 to 4 GB of RAM. A CPU-only host should work but translation may take
a few seconds per sentence; a small GPU host is much faster. Time a few requests on your host and set `NLLB_TIMEOUT_MS`
in the app above what you see. Translations are serialised (one at a time), and requests beyond `MAX_QUEUE` get a
quick 503 instead of piling up.

## 5. Tests
`FAKE_MODEL=1 python -m pytest tests` checks auth, validation, pivot rules and the queue limit without any weights.
