# Training Kikuyu, Kamba and Kalenjin adapters on your own PC

These scripts teach the translation model three more Kenyan languages. Everything runs on your machine: no cloud and no
paid service. Each language becomes a small LoRA adapter (about 35 MB) next to the Dholuo and Taita ones in
`translator-api/models/`. The service picks it up the next time it is deployed.

| Language | What NLLB-200 already knows | Training data (after cleaning) | Notes |
|---|---|---|---|
| Kikuyu (`kik`) | Kikuyu, weak | ~144k pairs: everyday and news (Biatus AfriNLLB), farming (CGIAR), 25k Bible (OPUS) | Works even before training. Training makes it better |
| Kamba (`kam`) | Kamba, weak | ~88k pairs, all religious text (OPUS, NLLB mined) | Output will sound formal and "church-like" until better data is out (Thiomi) |
| Kalenjin (`kln`) | Nothing | ~74k pairs: everyday and news (Biatus AfriNLLB, Lacuna Fund) | Uses the Dholuo tag, the way Taita uses Swahili. Needs the adapter |

## 1. One-time setup (PowerShell in VS Code)

Open the Tembea254 folder in VS Code, then open a terminal (Ctrl + `). Python 3.10, 3.11 or 3.12 works best.

```powershell
cd translator-api
py -3.11 -m venv .venv-train        # or: python -m venv .venv-train
.\.venv-train\Scripts\Activate.ps1  # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
python -m pip install --upgrade pip
```

Install PyTorch for your machine. Run `nvidia-smi` first: if it prints a table, you have an NVIDIA GPU.

```powershell
# NVIDIA GPU (much faster)
pip install torch --index-url https://download.pytorch.org/whl/cu124
# No NVIDIA GPU (CPU only)
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Then the rest:

```powershell
pip install -r training/requirements-train.txt
python -c "import torch; print('GPU' if torch.cuda.is_available() else 'CPU only')"
```

## 2. Get the data (about 400 MB of downloads, 5 to 10 minutes)

```powershell
python training/download_data.py --langs kik kam kln
```

It writes `training/data/<lang>/train.jsonl`, `dev.jsonl` and `test.jsonl`, plus `meta.json` with the counts and
licences. The data and checkpoints are in `.gitignore`, so they never end up on GitHub.

## 3. Train, one language at a time

The first run downloads the base model once (about 2.5 GB).

```powershell
python training/train_lora.py --lang kik
python training/train_lora.py --lang kln
python training/train_lora.py --lang kam
```

The script prints the loss, the seconds per step and the time left. Every so often it checks the dev set (chrF++,
higher is better) and saves the best adapter to `models/<lang>_lora/`.

How long it takes:

- NVIDIA GPU: 6000 steps, about 1 to 2 hours per language.
- CPU only: 1500 steps by default, roughly 2 to 5 hours per language on a recent laptop. Leave it running overnight,
  plugged in.

You can stop and restart at any time. Ctrl + C saves first, then you carry on later:

```powershell
python training/train_lora.py --lang kik --resume
```

Useful options:

| Option | Use it when |
|---|---|
| `--steps 300` | You want a quick trial first (about 20 to 40 minutes on a CPU) |
| `--steps 3000` | You want more training than the CPU default |
| `--max-train 40000` | You want to use fewer sentence pairs so each step of the data goes further |
| `--batch 4 --accum 8` | You run out of memory (same effective batch, less RAM) |
| `--grad-ckpt` | Your GPU has 4 GB or less |
| `--threads 6` | You want to keep some CPU free for other work |

The PC needs about 6 GB of free RAM for CPU training. 16 GB in total is comfortable.

## 4. Check the result

```powershell
python training/evaluate.py --lang kik
python training/evaluate.py --lang kik --text "Where is the bus to Nyeri?"
python training/evaluate.py --lang kln --text "Kagasin kabisaa." --from kln --to sw
```

`evaluate.py` scores the adapter against plain NLLB on 500 held-out sentences, in both directions. It saves the
numbers to `models/<lang>_lora/eval.json`. These make a good slide: "our model vs the base model".

## 5. Ship it

1. Check that `models/kik_lora/`, `models/kam_lora/` and `models/kln_lora/` each hold `adapter_config.json`,
   `adapter_model.safetensors` and `tembea.json`. The training checkpoints in `training/runs/` stay on your PC.
2. Commit the three adapter folders and push. Railway rebuilds the service and loads every adapter it finds.
   `app.py` already knows `ki`, `kam` and `kln`.
3. Open `https://<your-railway-url>/ready`. It should list `kik`, `kam` and `kln` under `adapters`.
4. Then the website gets switched over: Kikuyu, Kamba and Kalenjin move from the phrasebook to live translation in
   `lib/data/languages.ts`.

## Licences: read this before launch

| Source | Licence | Used by default |
|---|---|---|
| Biatus/afrinllb-kikuyu-kalenjin-dataset | Not stated on the dataset card | Yes. Ask the author before commercial use |
| CGIAR/KikuyuEnglish_translation | Apache-2.0 | Yes |
| OPUS MT560 (michsethowusu) | CC BY 4.0 | Yes |
| NLLB mined Kamba–Swahili (michsethowusu) | ODC-BY | Yes |
| Lacuna Fund Kalenjin–Swahili (Zenodo 13355021) | Apache-2.0 | Yes. Mostly already inside Biatus, so few new pairs |
| tketer/KalenjinEnglish (NIV Bible) | MIT on the dataset, but the NIV text is copyrighted | No. Add it with `--include-restricted` for experiments only |

Credit the sources in the app's About page and in the pitch. Coming soon and worth adding later: **Thiomi** (Kikuyu,
Kamba and Maasai, CC BY 4.0). With Maasai data, the same scripts can train a Maa adapter.
