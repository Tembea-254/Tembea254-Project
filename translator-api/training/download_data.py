"""Download and clean parallel data for Kikuyu (kik), Kamba (kam) and Kalenjin (kln).

    python training/download_data.py --langs kik kam kln

Writes training/data/<lang>/{train,dev,test}.jsonl. Each line is one sentence pair:
    {"other": "en" | "sw", "x": "<Kikuyu/Kamba/Kalenjin text>", "o": "<English/Swahili text>",
     "domain": "general" | "agri" | "bible", "source": "<dataset name>"}

Only openly licensed sets are used by default. Sets with unclear or non-commercial terms are skipped unless you pass
--include-restricted (fine for experiments, not for the product). Downloads are cached in training/data/raw.
"""
import argparse
import csv
import io
import json
import random
import re
import sys
import unicodedata
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
RAW = DATA / "raw"

ZENODO_URL = "https://zenodo.org/records/13355021/files/waleghwa/low-resource-language-data-v1.0.0.zip?download=1"


# ---------------------------------------------------------------- downloads

def hf_file(repo: str, filename: str) -> Path:
    from huggingface_hub import hf_hub_download

    return Path(hf_hub_download(repo_id=repo, filename=filename, repo_type="dataset", cache_dir=str(RAW / "hf")))


def url_file(url: str, name: str) -> Path:
    path = RAW / name
    if not path.exists():
        print(f"  downloading {name} ...", flush=True)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".part")
        with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
        tmp.rename(path)
    return path


# ---------------------------------------------------------------- sources
# Each loader yields (other_lang, x_text, other_text).

BIATUS = "Biatus/afrinllb-kikuyu-kalenjin-dataset"
NLLB_TO_SHORT = {"eng_Latn": "en", "swh_Latn": "sw"}


def biatus(lang_code: str):
    def load():
        for split in ("train.jsonl", "validation.jsonl", "test.jsonl"):
            with open(hf_file(BIATUS, split), encoding="utf-8") as f:
                for line in f:
                    t = json.loads(line).get("translation") or {}
                    if isinstance(t, str):  # some mirrors store the dict as a string
                        t = json.loads(t.replace("'", '"'))
                    if lang_code not in t:
                        continue
                    for k, v in t.items():
                        if k in NLLB_TO_SHORT:
                            yield NLLB_TO_SHORT[k], t[lang_code], v
    return load


def parquet_pairs(repo: str, filename: str, x_col: str, o_col: str, other: str):
    def load():
        import pandas as pd

        df = pd.read_parquet(hf_file(repo, filename), columns=[x_col, o_col])
        for x, o in zip(df[x_col], df[o_col]):
            yield other, x, o
    return load


def csv_pairs_by_score(repo: str, filename: str, x_col: str, o_col: str, other: str, min_score: float):
    """Mined pairs come with an alignment score: keep only the confident ones."""
    def load():
        import pandas as pd

        df = pd.read_csv(hf_file(repo, filename), usecols=["score", x_col, o_col])
        df = df[df["score"] >= min_score].sort_values("score", ascending=False)
        for x, o in zip(df[x_col], df[o_col]):
            yield other, x, o
    return load


def excel_pairs(repo: str, filename: str, x_col: str, o_col: str, other: str):
    def load():
        import pandas as pd

        for df in pd.read_excel(hf_file(repo, filename), sheet_name=None).values():
            if x_col in df and o_col in df:
                for x, o in zip(df[x_col], df[o_col]):
                    yield other, x, o
    return load


def zenodo_kalenjin():
    with zipfile.ZipFile(url_file(ZENODO_URL, "zenodo-13355021.zip")) as z:
        name = next(n for n in z.namelist() if n.endswith("Kalenjin-Kiswahili-Parallel-Corpus.csv"))
        raw = z.read(name)
    # the file is mostly UTF-8 with a few Windows-1252 lines: decode line by line so one bad byte costs one line
    lines = []
    for b in raw.splitlines():
        try:
            lines.append(b.decode("utf-8-sig"))
        except UnicodeDecodeError:
            lines.append(b.decode("cp1252", errors="replace"))
    for r in csv.DictReader(io.StringIO("\n".join(lines))):
        if r:
            yield "sw", r.get("Kalenjin"), r.get("Kiswahili")


# name, loader, domain, cap (max pairs kept), licence, open (usable in the product by default)
SOURCES = {
    "kik": [
        ("biatus-afrinllb", biatus("kik_Latn"), "general", None, "not stated on the card (ask the author before commercial use)", True),
        ("cgiar-agri", excel_pairs("CGIAR/KikuyuEnglish_translation", "English - Kikuyu Sentence Pairs Final (1).xlsx", "Kikuyu", "English", "en"), "agri", None, "Apache-2.0", True),
        ("mt560-en-kik", parquet_pairs("michsethowusu/english-gikuyu_sentence-pairs_mt560", "data/train-00000-of-00001.parquet", "kik", "eng", "en"), "bible", 25000, "CC BY 4.0 (OPUS)", True),
    ],
    "kam": [
        ("mt560-en-kam", parquet_pairs("michsethowusu/english-kamba_sentence-pairs_mt560", "data/train-00000-of-00001.parquet", "kam", "eng", "en"), "bible", None, "CC BY 4.0 (OPUS)", True),
        ("mined-kam-sw", csv_pairs_by_score("michsethowusu/kamba-swahili_sentence-pairs", "Kamba-Swahili_Sentence-Pairs.csv", "Kamba", "Swahili", "sw", 1.08), "bible", 40000, "ODC-BY (NLLB mined)", True),
    ],
    "kln": [
        ("biatus-afrinllb", biatus("kln_Latn"), "general", None, "not stated on the card (ask the author before commercial use)", True),
        ("zenodo-lacuna", zenodo_kalenjin, "general", None, "Apache-2.0 (Lacuna Fund)", True),
        ("kalenjin-niv-bible", excel_pairs("tketer/KalenjinEnglish", "engnivkal.xlsx", "Kalenjin", "English", "en"), "bible", 15000, "MIT on the dataset, but the NIV text is copyrighted", False),
    ],
}


# ---------------------------------------------------------------- cleaning

SPACE_BEFORE = re.compile(r"\s+([.,!?;:%)\]])")
SPACE_AFTER = re.compile(r"([(\[])\s+")
URLISH = re.compile(r"https?://|www\.|@\w|\.com\b", re.I)


def clean(s) -> str:
    if not isinstance(s, str):
        return ""
    s = unicodedata.normalize("NFC", s).replace(" ", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = SPACE_BEFORE.sub(r"\1", s)  # OPUS text is tokenised: "word ." -> "word."
    s = SPACE_AFTER.sub(r"\1", s)
    s = s.replace(" ' ", "'").replace(" n't", "n't")
    s = s.strip(' "“”')
    return s


def keep(x: str, o: str) -> bool:
    if not x or not o or x.lower() == o.lower():
        return False
    wx, wo = len(x.split()), len(o.split())
    if not (2 <= wx <= 60 and 2 <= wo <= 60):
        return False
    ratio = len(x) / max(1, len(o))
    if not (0.4 <= ratio <= 2.8):  # Bantu words are long, so allow a wide ratio, but drop obvious misalignments
        return False
    if URLISH.search(x) or URLISH.search(o):
        return False
    if sum(c.isdigit() for c in x) > len(x) * 0.3:  # verse numbers, tables
        return False
    return True


def build(lang: str, include_restricted: bool, dev_n: int, test_n: int, seed: int):
    rng = random.Random(seed)
    out_dir = DATA / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    pairs, seen, report = [], set(), []
    for name, loader, domain, cap, licence, is_open in SOURCES[lang]:
        if not is_open and not include_restricted:
            print(f"  skip {name}: {licence} (use --include-restricted to add it)")
            continue
        print(f"  {name} [{licence}]", flush=True)
        got = []
        try:
            for other, x, o in loader():
                x, o = clean(x), clean(o)
                if not keep(x, o):
                    continue
                key = (other, x.lower(), o.lower())
                if key in seen:
                    continue
                seen.add(key)
                got.append({"other": other, "x": x, "o": o, "domain": domain, "source": name})
        except Exception as e:  # one broken mirror should not stop the rest
            print(f"    ! {name} failed: {e!r}")
            continue
        rng.shuffle(got)
        if cap and len(got) > cap:
            got = got[:cap]
        report.append((name, licence, len(got)))
        print(f"    kept {len(got):,} pairs")
        pairs.extend(got)
    if not pairs:
        sys.exit(f"no data for {lang}")

    # dev/test come from the everyday sources when there are any, so the score reflects tourist-style text
    rng.shuffle(pairs)
    held_pool = [p for p in pairs if p["domain"] != "bible"] or pairs
    held = held_pool[: dev_n + test_n]
    held_x = {p["x"].lower() for p in held}
    dev, test = held[:dev_n], held[dev_n:]
    train = [p for p in pairs if p["x"].lower() not in held_x]  # no sentence leaks from test into training

    for split, rows in (("train", train), ("dev", dev), ("test", test)):
        with open(out_dir / f"{split}.jsonl", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    counts = Counter((p["other"], p["domain"]) for p in train)
    meta = {
        "lang": lang,
        "train": len(train), "dev": len(dev), "test": len(test),
        "by_pair_and_domain": {f"{k[0]}/{k[1]}": v for k, v in sorted(counts.items())},
        "sources": [{"name": n, "licence": l, "pairs": c} for n, l, c in report],
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  -> {out_dir}: train {len(train):,}  dev {len(dev)}  test {len(test)}")
    for k, v in sorted(counts.items()):
        print(f"     {k[0]}<->{lang} [{k[1]}]: {v:,}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--langs", nargs="+", default=["kik", "kam", "kln"], choices=sorted(SOURCES))
    ap.add_argument("--include-restricted", action="store_true", help="also use sets that are not cleared for commercial use")
    ap.add_argument("--dev", type=int, default=300)
    ap.add_argument("--test", type=int, default=500)
    ap.add_argument("--seed", type=int, default=13)
    a = ap.parse_args()
    for lang in a.langs:
        print(f"\n== {lang}")
        build(lang, a.include_restricted, a.dev, a.test, a.seed)


if __name__ == "__main__":
    main()
