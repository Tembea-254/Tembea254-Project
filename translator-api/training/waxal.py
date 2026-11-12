"""Download Google's WAXAL speech data for the Kenyan languages it has, on your own PC.

    python training/waxal.py                      # Kikuyu, Dholuo, Swahili text: uses the copy in waxal_text/ (instant)
    python training/waxal.py --download           # rebuild the text from Hugging Face (reads ~2.8 GB of audio files)
    python training/waxal.py --langs kik --audio  # also keep the recordings + metadata.csv for voice training later

WAXAL (google/WaxalNLP on Hugging Face) is read speech with its exact text. For Kenya it has Kikuyu (kik_tts, ~11 h,
8 voices), Dholuo (luo_tts, ~7 h, 8 voices) and Swahili (swa_tts). It has no Kamba, Kalenjin, Taita or Maasai
("mas" there is Masaaba from Uganda, not Maasai). Licence: CC-BY-SA-4.0. Credit "WAXAL (Google Research et al.)".

Writes training/data/waxal/<lang>/sentences.txt (one sentence per line), used by backtranslate.py.
With --audio it also writes training/data/waxal/<lang>/audio/*.mp3 and metadata.csv (file|text|speaker|split).
"""
import argparse
import csv
import re
import sys

from common import DATA

SETS = {"kik": "kik", "luo": "luo", "swa": "swa"}
REPO = "google/WaxalNLP"


def sentences(text: str):
    """Split a recorded script into sentences of a length the translator handles well."""
    text = re.sub(r"\s+", " ", text or "").strip()
    for s in re.split(r"(?<=[.!?])\s+", text):
        s = s.strip(" -–")
        words = len(s.split())
        if 3 <= words <= 40 and not re.search(r"\d{3,}", s):
            yield s


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--langs", nargs="+", default=["kik", "luo", "swa"], choices=sorted(SETS))
    ap.add_argument("--audio", action="store_true", help="also keep the recordings (Kikuyu ~750 MB, Dholuo ~690 MB)")
    ap.add_argument("--download", action="store_true", help="rebuild the text from Hugging Face instead of waxal_text/")
    a = ap.parse_args()

    bundled = DATA.parent / "waxal_text"
    if not (a.audio or a.download):
        for lang in a.langs:
            out = DATA / "waxal" / lang
            out.mkdir(parents=True, exist_ok=True)
            text = (bundled / f"{lang}.txt").read_text(encoding="utf-8")
            (out / "sentences.txt").write_text(text, encoding="utf-8")
            print(f"{lang}: {len(text.splitlines()):,} sentences -> {out / 'sentences.txt'}", flush=True)
        return

    import pandas as pd
    from huggingface_hub import HfApi, hf_hub_download

    api = HfApi()
    for lang in a.langs:
        out = DATA / "waxal" / lang
        out.mkdir(parents=True, exist_ok=True)
        files = sorted(f for f in api.list_repo_files(REPO, repo_type="dataset") if f.startswith(f"data/TTS/{SETS[lang]}/") and f.endswith(".parquet"))
        if not files:
            sys.exit(f"No WAXAL files found for {lang}")
        seen, kept, rows = set(), [], []
        for f in files:
            split = f.rsplit("/", 1)[-1].split("-")[1]
            print(f"{lang}: downloading {f} ...", flush=True)
            path = hf_hub_download(REPO, f, repo_type="dataset")
            cols = ["id", "text", "speaker_id"] + (["audio"] if a.audio else [])
            df = pd.read_parquet(path, columns=cols)
            for r in df.itertuples(index=False):
                for s in sentences(r.text):
                    if s.lower() not in seen:
                        seen.add(s.lower())
                        kept.append(s)
                if a.audio:
                    (out / "audio").mkdir(exist_ok=True)
                    name = f"{r.id}.mp3"
                    (out / "audio" / name).write_bytes(r.audio["bytes"])
                    rows.append((name, re.sub(r"\s+", " ", r.text).strip(), r.speaker_id, split))
        (out / "sentences.txt").write_text("\n".join(kept) + "\n", encoding="utf-8")
        if a.audio:
            with open(out / "metadata.csv", "w", newline="", encoding="utf-8") as fh:
                w = csv.writer(fh, delimiter="|")
                w.writerow(["file", "text", "speaker", "split"])
                w.writerows(rows)
        print(f"{lang}: {len(kept):,} sentences -> {out / 'sentences.txt'}" + (f", {len(rows):,} clips -> {out / 'audio'}" if a.audio else ""), flush=True)


if __name__ == "__main__":
    main()
