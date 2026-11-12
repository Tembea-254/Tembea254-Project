"""Back-translation: turn WAXAL's real Kikuyu sentences into extra English -> Kikuyu training pairs.

    python training/waxal.py --langs kik
    python training/backtranslate.py --lang kik --limit 1200
    python training/train_lora.py --lang kik --resume --steps 900 --extra bt

The current adapter translates real Kikuyu sentences into English. The English side is machine-made, but the Kikuyu
side is natural speech-script text, so the pairs teach the model to *write* better Kikuyu. They are only used in the
English -> Kikuyu direction (marked "bt"), never to teach Kikuyu -> English. Writes training/data/<lang>/bt.jsonl.
Safe to stop and run again: it keeps what is already translated.
"""
import argparse
import json
import sys
import time

from common import BASE_MODEL, DATA, LANGS, MODELS, device
from train_lora import translate

WAXAL = {"kik": "kik"}  # languages with WAXAL text and a trainable adapter in this kit


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=sorted(WAXAL))
    ap.add_argument("--limit", type=int, default=1200, help="sentences to translate (CPU: ~1-2 s each)")
    ap.add_argument("--batch", type=int, default=8)
    a = ap.parse_args()

    import torch
    from peft import PeftModel
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    lang, dev = a.lang, device()
    src = DATA / "waxal" / WAXAL[lang] / "sentences.txt"
    if not src.exists():
        sys.exit(f"No WAXAL text yet. Run first:  python training/waxal.py --langs {WAXAL[lang]}")
    adapter = MODELS / f"{lang}_lora"
    if not (adapter / "adapter_config.json").exists():
        sys.exit(f"No adapter at {adapter}. Train it first:  python training/train_lora.py --lang {lang}")
    out = DATA / lang / "bt.jsonl"
    done = set()
    if out.exists():
        done = {json.loads(l)["x"] for l in out.read_text(encoding="utf-8").splitlines() if l.strip()}
    todo = [s for s in src.read_text(encoding="utf-8").splitlines() if s.strip() and s not in done][: max(0, a.limit - len(done))]
    print(f"{LANGS[lang]['name']}: {len(done)} already translated, {len(todo)} to go", flush=True)
    if not todo:
        return

    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = PeftModel.from_pretrained(AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL), str(adapter)).to(dev).eval()
    t0 = time.time()
    with open(out, "a", encoding="utf-8") as fh:
        for i in range(0, len(todo), a.batch):
            chunk = todo[i : i + a.batch]
            en = translate(model, tok, chunk, LANGS[lang]["nllb"], "eng_Latn", dev, torch, beams=1, max_len=160)
            for x, o in zip(chunk, en):
                if o.strip():
                    fh.write(json.dumps({"x": x, "o": o.strip(), "other": "en", "domain": "general", "bt": True}, ensure_ascii=False) + "\n")
            fh.flush()
            n = i + len(chunk)
            rate = (time.time() - t0) / n
            print(f"{n}/{len(todo)}  ~{rate * (len(todo) - n) / 60:.0f} min left", flush=True)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
