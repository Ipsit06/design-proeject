import json
import os
import sys
import tempfile
from pathlib import Path

import torch
from transformers import AutoTokenizer

from architecture import DualStreamGMTFormer
from extract_features import process_continuous_video


ROOT = Path(__file__).resolve().parent
WEIGHTS = ROOT / "model_best.pth"
CACHE = ROOT / "cache"


def load_engine():
    if not WEIGHTS.exists():
        raise FileNotFoundError(f"Sanket checkpoint is missing: {WEIGHTS}")
    if not (CACHE / "t5-base").exists() or not (CACHE / "timesformer").exists():
        raise FileNotFoundError(
            "Sanket base models are missing. Run setup_cache.py before inference."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(str(CACHE / "t5-base"))
    model = DualStreamGMTFormer(t5_model_name="t5-base")
    checkpoint = torch.load(WEIGHTS, map_location=device)
    state = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state, strict=False)
    model.to(device)
    model.eval()
    return model, tokenizer, device


def translate(video_path: str, model, tokenizer, device):
    chunks = process_continuous_video(video_path, frames_per_chunk=8)
    if not chunks:
        return {"status": "uncertain", "translation": "", "chunks": 0}

    translations = []
    with torch.inference_mode():
        for video_tensor, pose_tensor in chunks:
            translation = model.generate_translation(
                video_tensor.to(device),
                pose_tensor.to(device),
                tokenizer=tokenizer,
                max_length=15,
            ).strip()
            if translation:
                translations.append(translation)

    return {
        "status": "recognized" if translations else "uncertain",
        "translation": " ".join(translations),
        "chunks": len(chunks),
        "provider": "sanket",
    }


def main():
    try:
        model, tokenizer, device = load_engine()
        for line in sys.stdin:
            if not line.strip():
                continue
            request = json.loads(line)
            result = translate(request["videoPath"], model, tokenizer, device)
            print(json.dumps(result), flush=True)
    except Exception as error:
        print(
            json.dumps(
                {
                    "status": "error",
                    "translation": "",
                    "provider": "sanket",
                    "error": str(error),
                }
            ),
            flush=True,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
