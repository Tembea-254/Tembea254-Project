"""
Tembea254 translation service (NLLB + LoRA adapters for Dholuo and Taita).

Endpoints
  GET  /health     liveness: the process is up (used by Docker / the platform to decide on restarts)
  GET  /ready      readiness: models are loaded and can translate (503 while loading)
  POST /translate  {"text": "...", "from": "en", "to": "luo"}   header: x-api-key

Self-healing: a watchdog translates a canary sentence every minute. If that fails or hangs three times in a row
the process exits, and the container restart policy brings it back with no manual action.
"""
import contextlib
import hmac
import logging
import os
import sys
import threading
import time

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("tembea-mt")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

API_KEY = os.getenv("NLLB_SERVICE_KEY", "")
BASE_MODEL = os.getenv("BASE_MODEL", "facebook/nllb-200-distilled-600M")
ADAPTER_DIR = os.getenv("ADAPTER_DIR", "/models")  # holds luo_lora/ and dav_lora/
FAKE = os.getenv("FAKE_MODEL") == "1"  # tests only: no weights, echo translations
MAX_QUEUE = int(os.getenv("MAX_QUEUE", "8"))
WATCHDOG_SECONDS = int(os.getenv("WATCHDOG_SECONDS", "60"))
WATCHDOG_STRIKES = int(os.getenv("WATCHDOG_STRIKES", "3"))

# Tembea language code -> NLLB code. Taita borrows the Swahili tag: its adapter was trained that way (and is the
# only adapter loaded for Taita requests, so it never clashes with real Swahili).
NLLB = {
    "en": "eng_Latn", "sw": "swh_Latn", "luo": "luo_Latn", "dav": "swh_Latn",
    "fr": "fra_Latn", "de": "deu_Latn", "es": "spa_Latn", "it": "ita_Latn", "pt": "por_Latn", "nl": "nld_Latn",
    "zh": "zho_Hans", "ja": "jpn_Jpan", "ar": "arb_Arab", "hi": "hin_Deva", "so": "som_Latn",
}
ADAPTER_FOR = {"luo": "luo", "dav": "dav"}
TAG_FOR = {"luo": "news", "dav": "bible"}  # domain tag used in training, put in front of English input
REQUIRED_ADAPTERS = {"dav"}  # without its adapter Taita would silently come out as plain Swahili


class Engine:
    def __init__(self):
        self.lock = threading.Lock()  # adapter switching is global state, so one translation at a time
        self.adapters: list[str] = []
        if FAKE:
            self.model = None
            return
        import torch
        from peft import PeftModel
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if self.device == "cuda" else torch.float32
        log.info("loading %s on %s", BASE_MODEL, self.device)
        self.tok = AutoTokenizer.from_pretrained(BASE_MODEL)
        base = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL, torch_dtype=dtype)
        model = base
        for name in ("luo", "dav"):
            path = os.path.join(ADAPTER_DIR, f"{name}_lora")
            if not os.path.isdir(path):
                log.warning("adapter %s not found at %s", name, path)
                continue
            if isinstance(model, PeftModel):
                model.load_adapter(path, adapter_name=name)
            else:
                model = PeftModel.from_pretrained(base, path, adapter_name=name)
            self.adapters.append(name)
            log.info("loaded adapter %s", name)
        self.model = model.to(self.device).eval()

    def _leg(self, text: str, src: str, dst: str) -> str:
        if FAKE:
            return f"[{src}>{dst}] {text}"
        adapter = ADAPTER_FOR.get(src) or ADAPTER_FOR.get(dst)
        if adapter in REQUIRED_ADAPTERS and adapter not in self.adapters:
            raise HTTPException(503, f"{adapter} adapter is not loaded")
        use_adapter = adapter in self.adapters
        if adapter and src == "en" and use_adapter:
            text = f"[{TAG_FOR[adapter]}] {text}"  # the same tag the adapter was trained with
        self.tok.src_lang = NLLB[src]
        enc = self.tok([text], return_tensors="pt", truncation=True, max_length=96).to(self.device)
        if use_adapter:
            self.model.set_adapter(adapter)
            ctx = contextlib.nullcontext()
        else:
            ctx = self.model.disable_adapter() if self.adapters else contextlib.nullcontext()
        with self.torch.no_grad(), ctx:
            out = self.model.generate(
                **enc,
                forced_bos_token_id=self.tok.convert_tokens_to_ids(NLLB[dst]),
                max_length=96, num_beams=4, no_repeat_ngram_size=3,
                max_time=20,  # hard stop for one sentence
            )
        return self.tok.batch_decode(out, skip_special_tokens=True)[0]

    def translate(self, text: str, src: str, dst: str) -> str:
        if src == dst:
            return text
        with self.lock:
            local = src in ADAPTER_FOR or dst in ADAPTER_FOR
            if local and "en" not in (src, dst):  # Dholuo <-> German, Taita <-> Dholuo ...: pivot through English
                return self._leg(self._leg(text, src, "en"), "en", dst)
            return self._leg(text, src, dst)


engine: Engine | None = None
load_error: str | None = None
inflight = 0
inflight_lock = threading.Lock()


def _load():
    global engine, load_error
    try:
        engine = Engine()
        engine.translate("Hello", "en", "sw")  # warm-up so the first real request is fast
        log.info("engine ready (adapters: %s)", engine.adapters if not FAKE else "fake")
    except Exception as e:  # keep the process alive so /health stays up and the error is visible
        load_error = repr(e)
        log.exception("engine failed to load")


def _watchdog():
    strikes = 0
    while True:
        time.sleep(WATCHDOG_SECONDS)
        if engine is None:
            continue
        result: list[str] = []
        t = threading.Thread(target=lambda: result.append(engine.translate("Hello", "en", "sw")), daemon=True)
        t.start()
        t.join(30)
        strikes = 0 if result else strikes + 1
        if strikes:
            log.error("watchdog: canary failed (%d/%d)", strikes, WATCHDOG_STRIKES)
        if strikes >= WATCHDOG_STRIKES:
            log.critical("watchdog: engine stuck, exiting so the platform restarts the container")
            os._exit(1)


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_load, daemon=True).start()
    threading.Thread(target=_watchdog, daemon=True).start()
    yield


app = FastAPI(title="Tembea254 translation service", docs_url=None, redoc_url=None, lifespan=lifespan)


class Req(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    from_: str = Field(alias="from")
    to: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    if engine is None:
        raise HTTPException(503, load_error or "loading")
    return {"status": "ready", "adapters": engine.adapters, "fake": FAKE}


@app.post("/translate")
def translate(req: Req, x_api_key: str = Header(default="")):
    global inflight
    if API_KEY and not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(401, "bad key")
    if engine is None:
        raise HTTPException(503, load_error or "loading")
    if req.from_ not in NLLB or req.to not in NLLB:
        raise HTTPException(400, "unsupported language")
    with inflight_lock:
        if inflight >= MAX_QUEUE:
            raise HTTPException(503, "busy")
        inflight += 1
    try:
        t0 = time.time()
        out = engine.translate(req.text.strip(), req.from_, req.to)
        log.info("%s>%s %d chars %.2fs", req.from_, req.to, len(req.text), time.time() - t0)
        return {"text": out}
    finally:
        with inflight_lock:
            inflight -= 1
