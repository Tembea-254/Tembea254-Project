"""Train a LoRA adapter on NLLB-200 for one language, on your own machine.

    python training/train_lora.py --lang kik
    python training/train_lora.py --lang kik --resume          # carry on after stopping (Ctrl+C saves first)
    python training/train_lora.py --lang kam --steps 300       # quick trial run
    python training/train_lora.py --lang kik --resume --steps 900 --extra bt   # add back-translated WAXAL pairs

Trains both directions (English <-> X and Swahili <-> X). The best checkpoint by dev chrF++ is written to
translator-api/models/<lang>_lora/ (adapter_config.json, adapter_model.safetensors, tembea.json), ready for app.py.
Runs on an NVIDIA GPU (CUDA), an Intel Arc GPU (XPU) or the CPU, whichever is available.
"""
import argparse
import json
import math
import os
import random
import shutil
import signal
import sys
import time
from collections import Counter, defaultdict

from common import BASE_MODEL, DATA, LANGS, LORA, MODELS, OTHER, RUNS, device, tagged


def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def directions(rows, lang, tag_of):
    """Each pair gives two examples: other -> X and X -> other."""
    x_code = LANGS[lang]["nllb"]
    out = []
    for r in rows:
        o_code = OTHER[r["other"]]
        out.append((o_code, x_code, tagged(r["o"], r["other"], tag_of(r)), r["x"]))
        if not r.get("bt"):  # back-translated pairs have machine-made English: only learn to write the language
            out.append((x_code, o_code, r["x"], r["o"]))
    return out


def tokenize(tok, examples, max_len):
    """Group by direction so the tokenizer adds the right language tokens."""
    groups = defaultdict(list)
    for i, (s, t, src, tgt) in enumerate(examples):
        groups[(s, t)].append((i, src, tgt))
    feats = [None] * len(examples)
    for (s, t), items in groups.items():
        tok.src_lang, tok.tgt_lang = s, t
        enc = tok([x[1] for x in items], text_target=[x[2] for x in items], truncation=True, max_length=max_len)
        for k, (i, _, _) in enumerate(items):
            feats[i] = (enc["input_ids"][k], enc["labels"][k])
    return feats


def batches(feats, batch_size, rng):
    """Length-bucketed batches: similar lengths together means far less padding (matters a lot on a CPU)."""
    idx = list(range(len(feats)))
    rng.shuffle(idx)
    chunk = batch_size * 50
    out = []
    for c in range(0, len(idx), chunk):
        part = sorted(idx[c : c + chunk], key=lambda i: len(feats[i][0]))
        out += [part[b : b + batch_size] for b in range(0, len(part), batch_size)]
    rng.shuffle(out)
    return out


def collate(feats, ids, pad_id, torch):
    src = [feats[i][0] for i in ids]
    tgt = [feats[i][1] for i in ids]
    ls, lt = max(map(len, src)), max(map(len, tgt))
    input_ids = torch.tensor([s + [pad_id] * (ls - len(s)) for s in src])
    attention = torch.tensor([[1] * len(s) + [0] * (ls - len(s)) for s in src])
    labels = torch.tensor([t + [-100] * (lt - len(t)) for t in tgt])
    return {"input_ids": input_ids, "attention_mask": attention, "labels": labels}


def translate(model, tok, texts, src, tgt, dev, torch, beams=1, max_len=128):
    tok.src_lang = src
    out = []
    for i in range(0, len(texts), 16):
        enc = tok(texts[i : i + 16], return_tensors="pt", padding=True, truncation=True, max_length=max_len).to(dev)
        with torch.no_grad():
            gen = model.generate(**enc, forced_bos_token_id=tok.convert_tokens_to_ids(tgt), num_beams=beams, max_length=max_len, no_repeat_ngram_size=3)
        out += tok.batch_decode(gen, skip_special_tokens=True)
    return out


def dev_score(model, tok, dev_rows, lang, tag_of, dev, torch, n):
    """chrF++ on the dev set, both directions, averaged."""
    import sacrebleu

    model.eval()
    rows = dev_rows[:n]
    x_code = LANGS[lang]["nllb"]
    scores = []
    for other in ("en", "sw"):
        rs = [r for r in rows if r["other"] == other]
        if not rs:
            continue
        hyp = translate(model, tok, [tagged(r["o"], other, tag_of(r)) for r in rs], OTHER[other], x_code, dev, torch)
        scores.append(sacrebleu.corpus_chrf(hyp, [[r["x"] for r in rs]], word_order=2).score)
        hyp = translate(model, tok, [r["x"] for r in rs], x_code, OTHER[other], dev, torch)
        scores.append(sacrebleu.corpus_chrf(hyp, [[r["o"] for r in rs]], word_order=2).score)
    model.train()
    return sum(scores) / max(1, len(scores))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=sorted(LANGS))
    ap.add_argument("--steps", type=int, default=0, help="optimizer steps (default: about 2 passes over the data, capped at 6000 on a GPU and 1500 on a CPU)")
    ap.add_argument("--batch", type=int, default=0, help="sentences per micro-batch (default 16 on a GPU, 8 on a CPU)")
    ap.add_argument("--accum", type=int, default=0, help="micro-batches per step (default: 2 on a GPU, 4 on a CPU, so 32 sentences a step)")
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--max-len", type=int, default=96)
    ap.add_argument("--max-train", type=int, default=0, help="use at most this many sentence pairs (0 = all)")
    ap.add_argument("--eval-every", type=int, default=0, help="steps between dev checks (default: steps/8)")
    ap.add_argument("--eval-n", type=int, default=0, help="dev sentences per check (default 200 on a GPU, 60 on a CPU)")
    ap.add_argument("--threads", type=int, default=0, help="CPU threads for torch (default: all cores)")
    ap.add_argument("--grad-ckpt", action="store_true", help="save GPU memory (slower). Try it on a 4 GB card")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--extra", nargs="*", default=[], help="extra pair files in data/<lang>/ to add, e.g. bt (bt.jsonl from backtranslate.py)")
    a = ap.parse_args()

    import torch
    from peft import LoraConfig, PeftModel, TaskType, get_peft_model
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, get_linear_schedule_with_warmup

    lang = a.lang
    dev = device()
    gpu = dev != "cpu"
    if a.threads:
        torch.set_num_threads(a.threads)
    batch = a.batch or (16 if gpu else 8)
    accum = a.accum or (2 if gpu else 4)
    eval_n = a.eval_n or (200 if gpu else 60)
    rng = random.Random(a.seed)
    torch.manual_seed(a.seed)

    data_dir = DATA / lang
    if not (data_dir / "train.jsonl").exists():
        sys.exit(f"No data in {data_dir}. Run first:  python training/download_data.py --langs {lang}")
    train_rows = load_jsonl(data_dir / "train.jsonl")
    dev_rows = load_jsonl(data_dir / "dev.jsonl")
    rng.shuffle(dev_rows)
    if a.max_train:
        rng.shuffle(train_rows)
        train_rows = train_rows[: a.max_train]
    for name in a.extra:
        extra = data_dir / f"{name}.jsonl"
        if not extra.exists():
            sys.exit(f"No {extra}. For back-translation run:  python training/backtranslate.py --lang {lang}")
        more = load_jsonl(extra)
        # repeat the small extra set so it is not drowned out by the big corpus
        reps = max(1, min(4, len(train_rows) // max(1, 20 * len(more))))
        train_rows += more * reps
        print(f"added {len(more):,} pairs from {extra.name} (x{reps})", flush=True)

    # The serving tag is the domain most English pairs come from: that is the style the app will ask for.
    en_domains = Counter(r["domain"] for r in train_rows if r["other"] == "en")
    serve_tag = "general" if en_domains.get("general") or en_domains.get("agri") else (en_domains.most_common(1)[0][0] if en_domains else "general")
    tag_of = lambda r: r["domain"]  # noqa: E731

    print(f"{LANGS[lang]['name']}: {len(train_rows):,} pairs, device {dev}, batch {batch} x {accum}", flush=True)
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    examples = directions(train_rows, lang, tag_of)
    t0 = time.time()
    feats = tokenize(tok, examples, a.max_len)
    print(f"tokenised {len(feats):,} examples in {time.time() - t0:.0f}s", flush=True)

    per_step = batch * accum
    steps = a.steps or min(6000 if gpu else 1500, max(300, math.ceil(2 * len(feats) / per_step)))
    eval_every = a.eval_every or max(100, steps // 8)

    model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL)
    run_dir = RUNS / lang
    ckpt = run_dir / "last"
    state = {"step": 0, "best": -1.0, "history": []}
    if a.resume and (ckpt / "adapter_config.json").exists():
        model = PeftModel.from_pretrained(model, str(ckpt), is_trainable=True)
        state = json.loads((run_dir / "state.json").read_text())
        print(f"resuming from step {state['step']} (best dev chrF++ {state['best']:.1f})")
    else:
        if run_dir.exists() and not a.resume:
            shutil.rmtree(run_dir)
        model = get_peft_model(model, LoraConfig(task_type=TaskType.SEQ_2_SEQ_LM, **LORA))
    if a.grad_ckpt:
        model.gradient_checkpointing_enable()
        model.enable_input_require_grads()
    model.print_trainable_parameters()
    model.to(dev).train()

    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=a.lr, weight_decay=0.01)
    sched = get_linear_schedule_with_warmup(opt, min(200, steps // 10), steps)
    if a.resume and (run_dir / "optim.pt").exists():
        saved = torch.load(run_dir / "optim.pt", map_location="cpu")
        opt.load_state_dict(saved["opt"])
        sched.load_state_dict(saved["sched"])

    use_amp = dev == "cuda"
    amp_dtype = torch.bfloat16 if use_amp and torch.cuda.is_bf16_supported() else torch.float16
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp and amp_dtype == torch.float16)

    def save_last():
        run_dir.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(str(ckpt))
        torch.save({"opt": opt.state_dict(), "sched": sched.state_dict()}, run_dir / "optim.pt")
        (run_dir / "state.json").write_text(json.dumps(state, indent=2))

    def save_best(score):
        out = MODELS / f"{lang}_lora"
        out.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(str(out))
        meta_src = json.loads((data_dir / "meta.json").read_text(encoding="utf-8")) if (data_dir / "meta.json").exists() else {}
        (out / "tembea.json").write_text(json.dumps({
            "lang": lang,
            "app_code": LANGS[lang]["app_code"],
            "nllb_code": LANGS[lang]["nllb"],
            "tag": serve_tag,
            "pairs": ["en", "sw"],
            "base_model": BASE_MODEL,
            "step": state["step"],
            "dev_chrf": round(score, 2),
            "sources": meta_src.get("sources", []),
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  saved best adapter -> {out}", flush=True)

    stop = {"now": False}

    def on_ctrl_c(*_):
        if stop["now"]:
            sys.exit(1)
        stop["now"] = True
        print("\nstopping after this step and saving (press Ctrl+C again to quit without saving)", flush=True)

    signal.signal(signal.SIGINT, on_ctrl_c)

    if state["step"] == 0 and state["best"] < 0:
        base = dev_score(model, tok, dev_rows, lang, tag_of, dev, torch, eval_n)
        print(f"dev chrF++ before training: {base:.1f}", flush=True)
        state["history"].append({"step": 0, "chrf": round(base, 2)})

    order, pos = [], 0
    t_start, loss_sum, loss_n = time.time(), 0.0, 0
    while state["step"] < steps and not stop["now"]:
        opt.zero_grad(set_to_none=True)
        for _ in range(accum):
            if pos >= len(order):
                order, pos = batches(feats, batch, rng), 0
            b = collate(feats, order[pos], tok.pad_token_id, torch)
            pos += 1
            b = {k: v.to(dev) for k, v in b.items()}
            with torch.autocast(device_type="cuda", dtype=amp_dtype, enabled=use_amp):
                loss = model(**b).loss / accum
            scaler.scale(loss).backward()
            loss_sum += loss.item() * accum
            loss_n += 1
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1.0)
        scaler.step(opt)
        scaler.update()
        sched.step()
        state["step"] += 1
        s = state["step"]
        if s % 20 == 0 or s == 1:
            rate = (time.time() - t_start) / max(1, loss_n / accum)
            eta = rate * (steps - s)
            print(f"step {s}/{steps}  loss {loss_sum / loss_n:.3f}  {rate:.1f}s/step  ~{eta / 3600:.1f}h left", flush=True)
            loss_sum, loss_n, t_start = 0.0, 0, time.time()
        if s % eval_every == 0 or s == steps:
            score = dev_score(model, tok, dev_rows, lang, tag_of, dev, torch, eval_n)
            state["history"].append({"step": s, "chrf": round(score, 2)})
            better = score > state["best"]
            print(f"  dev chrF++ {score:.1f}{'  (best so far)' if better else ''}", flush=True)
            if better:
                state["best"] = score
                save_best(score)
            save_last()
    save_last()
    if state["best"] < 0 or stop["now"]:
        score = dev_score(model, tok, dev_rows, lang, tag_of, dev, torch, eval_n)
        if score > state["best"]:
            state["best"] = score
            save_best(score)
            save_last()
    print(f"done at step {state['step']}. Best dev chrF++ {state['best']:.1f}. Adapter: {MODELS / (lang + '_lora')}")
    if state["step"] < steps:
        print(f"Carry on later with:  python training/train_lora.py --lang {lang} --resume" + (f" --steps {steps}" if a.steps else ""))


if __name__ == "__main__":
    main()
