"""Speak a sentence in Kikuyu or Swahili with Meta's MMS-TTS voices, and save it as a .wav file.

    python training/voice_demo.py --lang kik --text "Bas ĩrĩa ĩrathiĩ Nyeri ĩkoragwo kũ?"
    python training/voice_demo.py --lang swa --text "Basi ya kwenda Nyeri iko wapi?"

Writes training/voice/<lang>-<n>.wav. MMS-TTS voices: facebook/mms-tts-kik and facebook/mms-tts-swh (about 145 MB
each, downloaded once). Their licence is CC-BY-NC-4.0: fine for a demo or research, NOT for a commercial launch.
For launch, train our own voices from WAXAL (CC-BY-SA, commercial use allowed) - that needs a GPU, see README.
There is no MMS voice for Dholuo, Kamba, Kalenjin or Taita.
"""
import argparse
import wave
from pathlib import Path

VOICES = {"kik": "facebook/mms-tts-kik", "swa": "facebook/mms-tts-swh"}
OUT = Path(__file__).resolve().parent / "voice"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=sorted(VOICES))
    ap.add_argument("--text", required=True)
    a = ap.parse_args()

    import torch
    from transformers import AutoTokenizer, VitsModel

    tok = AutoTokenizer.from_pretrained(VOICES[a.lang])
    model = VitsModel.from_pretrained(VOICES[a.lang]).eval()
    torch.manual_seed(13)
    with torch.no_grad():
        audio = model(**tok(a.text, return_tensors="pt")).waveform[0].numpy()
    OUT.mkdir(exist_ok=True)
    path = OUT / f"{a.lang}-{len(list(OUT.glob(f'{a.lang}-*.wav'))) + 1}.wav"
    pcm = (audio.clip(-1, 1) * 32767).astype("int16").tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(model.config.sampling_rate)
        w.writeframes(pcm)
    print(f"{a.lang}: {len(audio) / model.config.sampling_rate:.1f}s of speech -> {path}")


if __name__ == "__main__":
    main()
