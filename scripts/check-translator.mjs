#!/usr/bin/env node
// Pre-deploy check for the translator engines. Needs Node 18+. No dependencies.
//   NLLB_SERVICE_URL=https://... NLLB_SERVICE_KEY=... GOOGLE_TRANSLATE_API_KEY=... node scripts/check-translator.mjs
const URL_ = (process.env.NLLB_SERVICE_URL || "").replace(/\/+$/, "");
const KEY = process.env.NLLB_SERVICE_KEY || "";
const GKEY = process.env.GOOGLE_TRANSLATE_API_KEY || "";

let failures = 0;
const line = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
};
const warn = (msg) => console.log(`NOTE  ${msg}`);

async function timed(url, init = {}, ms = 60000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    return { res, ms: Date.now() - t0 };
  } finally {
    clearTimeout(t);
  }
}

async function checkService() {
  if (!URL_) return warn("NLLB_SERVICE_URL not set: skipping the model service checks");
  try {
    const h = await timed(`${URL_}/health`, {}, 10000);
    line(h.res.ok, `service /health (${h.ms} ms)`);
  } catch (e) {
    return line(false, `service unreachable: ${e.message}`);
  }
  const r = await timed(`${URL_}/ready`, {}, 10000).catch((e) => ({ err: e }));
  if (r.err || !r.res.ok) return line(false, "service /ready: models are not loaded yet (wait and retry, or check the service logs)");
  const info = await r.res.json();
  line(true, `service /ready, adapters loaded: ${(info.adapters || []).join(", ") || "none"}${info.fake ? " (FAKE MODEL)" : ""}`);
  if (!info.fake && !(info.adapters || []).includes("dav")) line(false, "Taita adapter (dav_lora) is not loaded");
  if (!info.fake && !(info.adapters || []).includes("luo")) warn("Dholuo adapter (luo_lora) is not loaded: Dholuo will use the base model");

  const samples = [
    ["en", "sw", "Where is the toilet?"],
    ["en", "luo", "How much is this?"],
    ["luo", "en", "Erokamano ahinya"],
    ["en", "dav", "Thank you very much"],
    ["de", "luo", "Wo ist die Toilette?"],
  ];
  const times = [];
  for (const [from, to, text] of samples) {
    try {
      const { res, ms } = await timed(`${URL_}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY },
        body: JSON.stringify({ text, from, to }),
      });
      const d = res.ok ? await res.json() : {};
      line(res.ok && !!d.text, `${from}->${to}  ${ms} ms  ${res.ok ? JSON.stringify(d.text) : "HTTP " + res.status}`);
      if (res.ok) times.push(ms);
    } catch (e) {
      line(false, `${from}->${to} ${e.message}`);
    }
  }
  if (times.length) {
    const worst = Math.max(...times);
    const suggest = Math.min(30000, Math.max(4000, Math.round((worst * 3) / 1000) * 1000));
    console.log(`\nSlowest call ${worst} ms (the first call after a start is usually the slowest).`);
    console.log(`Suggested NLLB_TIMEOUT_MS=${suggest}. Pivot pairs such as de->luo make two model calls, so allow for that.`);
    console.log("If your Vercel plan limits functions to 10 s, keep NLLB_TIMEOUT_MS at 6000 or less.\n");
  }
}

async function checkGoogle() {
  if (!GKEY) return warn("GOOGLE_TRANSLATE_API_KEY not set: skipping the Google checks (the app will use NLLB, then MyMemory)");
  try {
    const { res, ms } = await timed(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GKEY)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: "Hello", source: "en", target: "de", format: "text" }) },
      10000,
    );
    line(res.ok, `Google translate en->de (${ms} ms)${res.ok ? "" : " HTTP " + res.status + " (check the key, billing and that the Cloud Translation API is enabled)"}`);
    const l = await timed(`https://translation.googleapis.com/language/translate/v2/languages?target=en&key=${encodeURIComponent(GKEY)}`, {}, 10000);
    if (l.res.ok) {
      const codes = ((await l.res.json()).data?.languages || []).map((x) => x.language);
      console.log(`      Google lists ${codes.length} languages. Swahili: ${codes.includes("sw")}, Luo: ${codes.includes("luo")}, Somali: ${codes.includes("so")}`);
      if (codes.includes("luo")) warn("Google supports Luo. Compare it with your fine-tuned model on 20 sentences before choosing one.");
    }
  } catch (e) {
    line(false, `Google unreachable: ${e.message}`);
  }
}

await checkService();
await checkGoogle();
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
