"""Settings shared by the training and evaluation scripts. Keep them in step with ../app.py."""
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
MODELS = HERE.parent / "models"  # the service loads adapters from here (translator-api/models/<name>_lora)
RUNS = HERE / "runs"  # checkpoints while training

BASE_MODEL = os.getenv("BASE_MODEL", "facebook/nllb-200-distilled-600M")

# Same adapter shape as the Dholuo and Taita adapters, so app.py loads them the same way.
LORA = dict(r=16, lora_alpha=32, lora_dropout=0.05, target_modules=["q_proj", "k_proj", "v_proj", "out_proj", "fc1", "fc2"])

OTHER = {"en": "eng_Latn", "sw": "swh_Latn"}

# lang -> NLLB tag. NLLB-200 already knows Kikuyu and Kamba. It has no Kalenjin, so Kalenjin borrows the Dholuo tag
# (a fellow Nilotic language), the same trick the Taita adapter uses with the Swahili tag. The app loads only the
# Kalenjin adapter for Kalenjin requests, so it never mixes with real Dholuo.
LANGS = {
    "kik": {"name": "Kikuyu", "nllb": "kik_Latn", "app_code": "ki"},
    "kam": {"name": "Kamba", "nllb": "kam_Latn", "app_code": "kam"},
    "kln": {"name": "Kalenjin", "nllb": "luo_Latn", "app_code": "kln", "borrowed": True},
}


def device():
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch, "xpu", None) is not None and torch.xpu.is_available():  # Intel Arc GPUs with the XPU build of torch
        return "xpu"
    return "cpu"


def tagged(text: str, src: str, tag: str | None) -> str:
    """English input carries the domain tag, exactly as app.py adds it at serving time."""
    return f"[{tag}] {text}" if tag and src == "en" else text
