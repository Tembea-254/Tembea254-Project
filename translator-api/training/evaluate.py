"""Score a trained adapter against the plain NLLB model on the held-out test set, or try your own sentences.

    python training/evaluate.py --lang kik                      # base vs adapter, BLEU and chrF++, both directions
    python training/evaluate.py --lang kik --text "Where is the bus to Nyeri?"
    python training/evaluate.py --lang kik --text "Ũrĩ mwega?" --from kik --to en

Writes translator-api/models/<lang>_lora/eval.json, which is handy for the pitch: "our model scores X vs Y".
"""
import argparse
import json
import sys

from common import BASE_MODEL, DATA, LANGS, MODELS, OTHER, device, tagged, read_json
from train_lora import load_jsonl, translate


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=sorted(LANGS))
    ap.add_argument("--n", type=int, default=200, help="test sentences per direction")
    ap.add_argument("--beams", type=int, default=4, help="4 matches the live service")
    ap.add_argument("--text", help="translate this instead of scoring")
    ap.add_argument("--from", dest="src", default="en", help="en, sw or the language (kik/kam/kln)")
    ap.add_argument("--to", dest="dst", default=None)
    ap.add_argument("--no-base", action="store_true", help="skip the base-model comparison (halves the time)")
    a = ap.parse_args()

    import sacrebleu
    import torch
    from peft import PeftModel
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    lang, dev = a.lang, device()
    adapter_dir = MODELS / f"{lang}_lora"
    if not (adapter_dir / "adapter_config.json").exists():
        sys.exit(f"No adapter at {adapter_dir}. Train it first:  python training/train_lora.py --lang {lang}")
    meta = read_json(adapter_dir / "tembea.json")
    tag = meta.get("tag", "general")
    code = {**OTHER, lang: LANGS[lang]["nllb"]}

    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    base = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL)
    model = PeftModel.from_pretrained(base, str(adapter_dir)).to(dev).eval()

    if a.text:
        src = a.src
        dst = a.dst or (lang if src in OTHER else "en")
        out = translate(model, tok, [tagged(a.text, src, tag)], code[src], code[dst], dev, torch, beams=a.beams)[0]
        print(f"{src} > {dst}: {out}")
        if not a.no_base:
            with model.disable_adapter():
                plain = translate(model, tok, [a.text], code[src], code[dst], dev, torch, beams=a.beams)[0]
            print(f"plain NLLB:  {plain}")
        return

    test = load_jsonl(DATA / lang / "test.jsonl")
    results = {"lang": lang, "beams": a.beams, "directions": {}}
    for other in ("en", "sw"):
        rows = [r for r in test if r["other"] == other][: a.n]
        if not rows:
            continue
        for src, dst, srcs, refs, use_tag in (
            (other, lang, [r["o"] for r in rows], [r["x"] for r in rows], True),
            (lang, other, [r["x"] for r in rows], [r["o"] for r in rows], False),
        ):
            name = f"{src}>{dst}"
            print(f"\n{name}: {len(rows)} sentences", flush=True)
            ins = [tagged(s, src, tag) for s in srcs] if use_tag else srcs
            hyp = translate(model, tok, ins, code[src], code[dst], dev, torch, beams=a.beams)
            res = {"adapter": {"chrf++": round(sacrebleu.corpus_chrf(hyp, [refs], word_order=2).score, 1), "bleu": round(sacrebleu.corpus_bleu(hyp, [refs]).score, 1)}}
            if not a.no_base:
                with model.disable_adapter():
                    plain = translate(model, tok, srcs, code[src], code[dst], dev, torch, beams=a.beams)
                res["base"] = {"chrf++": round(sacrebleu.corpus_chrf(plain, [refs], word_order=2).score, 1), "bleu": round(sacrebleu.corpus_bleu(plain, [refs]).score, 1)}
            res["samples"] = [{"src": s, "ref": r, "ours": h} for s, r, h in list(zip(srcs, refs, hyp))[:5]]
            results["directions"][name] = res
            line = f"  ours  chrF++ {res['adapter']['chrf++']:5.1f}  BLEU {res['adapter']['bleu']:5.1f}"
            if "base" in res:
                line += f"   |   plain NLLB  chrF++ {res['base']['chrf++']:5.1f}  BLEU {res['base']['bleu']:5.1f}"
            print(line)
            for smp in res["samples"][:3]:
                print(f"    {smp['src']}\n      ref:  {smp['ref']}\n      ours: {smp['ours']}")
    (adapter_dir / "eval.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nsaved {adapter_dir / 'eval.json'}")
    if LANGS[lang].get("borrowed"):
        print("(NLLB has no Kalenjin, so the plain-model score is expected to be very low: that gap is what the adapter adds.)")


if __name__ == "__main__":
    main()
