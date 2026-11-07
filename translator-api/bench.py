import os, time
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from app import cpu_limit, BASE_MODEL, ADAPTER_DIR

print(f"host cores: {os.cpu_count()} | container cpu limit: {cpu_limit()} | torch default threads: {torch.get_num_threads()}")
tok = AutoTokenizer.from_pretrained(BASE_MODEL)
t0 = time.time()
model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL).eval()
print(f"base model load: {time.time() - t0:.1f}s\n")

def run(text, src, dst, beams, limit=24):
    tok.src_lang = src
    enc = tok([text], return_tensors="pt")
    t = time.time()
    with torch.no_grad():
        out = model.generate(**enc, forced_bos_token_id=tok.convert_tokens_to_ids(dst), max_length=limit,
                             num_beams=beams, no_repeat_ngram_size=3)
    return time.time() - t, int(out.shape[1]), tok.batch_decode(out, skip_special_tokens=True)[0]

print("threads | beams | seconds | tokens out (limit 24) | output")
for threads in sorted({torch.get_num_threads(), 1, 2, 4, cpu_limit()}):
    torch.set_num_threads(threads)
    run("Hello", "eng_Latn", "swh_Latn", 1)  # warm up this setting
    for beams in (1, 4):
        sec, n, txt = run("Where is the toilet?", "eng_Latn", "swh_Latn", beams)
        print(f"{threads:>7} | {beams:>5} | {sec:>7.2f} | {n:>21} | {txt}")

print("\nwith the Dholuo adapter attached (not merged):")
from peft import PeftModel
pm = PeftModel.from_pretrained(model, os.path.join(ADAPTER_DIR, "luo_lora"), adapter_name="luo").eval()
model = pm
torch.set_num_threads(max(1, min(cpu_limit(), 8)))
sec, n, txt = run("[news] Where is the toilet?", "eng_Latn", "luo_Latn", 1)
print(f"  attached: {sec:.2f}s, {n} tokens, {txt}")
model = pm.merge_and_unload().eval()
sec, n, txt = run("[news] Where is the toilet?", "eng_Latn", "luo_Latn", 1)
print(f"  merged:   {sec:.2f}s, {n} tokens, {txt}")
