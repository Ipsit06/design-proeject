"""
predict.py - Single-image gesture prediction using the trained Hand Gesture model.

Usage:
    cd hand-gesture-recognition
    python src/predict.py path/to/image.jpg
    python src/predict.py path/to/image.jpg --top 5
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image
from tensorflow import keras

from config import BEST_MODEL_PATH, LABELS_PATH, IMG_SIZE


def load_class_names() -> list[str]:
    if not os.path.exists(LABELS_PATH):
        raise FileNotFoundError(f"Class names file not found at: {LABELS_PATH}")
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def preprocess_image(image_path: str) -> np.ndarray:
    """Load, convert to RGB, resize, and normalize a single image."""
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image file does not exist: {image_path}")

    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            if img.size != IMG_SIZE:
                img = img.resize(IMG_SIZE, Image.Resampling.BILINEAR)
            arr = np.asarray(img, dtype=np.float32) / 255.0
            return np.expand_dims(arr, axis=0)
    except Exception as e:
        raise ValueError(f"Corrupted or unreadable image file ({image_path}): {e}")


def predict(image_path: str, top_k: int = 3) -> dict:
    if not os.path.exists(BEST_MODEL_PATH):
        print(f"[predict] ERROR: Model file not found at: {BEST_MODEL_PATH}")
        print("Please train the model first by running: python run_train.py")
        sys.exit(1)

    classes = load_class_names()
    model = keras.models.load_model(BEST_MODEL_PATH, compile=False)

    try:
        x = preprocess_image(image_path)
    except Exception as err:
        print(f"[predict] Input Error: {err}")
        return {}

    probs = model.predict(x, verbose=0)[0]
    top_indices = np.argsort(probs)[::-1][:top_k]

    top_label = classes[top_indices[0]]
    top_conf = float(probs[top_indices[0]])

    print("\n" + "=" * 50)
    print(f"  PREDICTION RESULT: {os.path.basename(image_path)}")
    print("=" * 50)
    print(f"  Top Gesture  : '{top_label}'")
    print(f"  Confidence   : {top_conf * 100:.2f}%\n")
    print(f"  Top-{top_k} Candidates:")
    for rank, idx in enumerate(top_indices, 1):
        marker = "==>" if rank == 1 else "   "
        print(f"   {marker} Rank {rank}: '{classes[idx]:>2}' -- Confidence: {probs[idx] * 100:.2f}%")
    print("=" * 50)

    return {
        "predicted_class": top_label,
        "confidence": top_conf,
        "top_candidates": [(classes[i], float(probs[i])) for i in top_indices],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hand gesture single-image classifier")
    parser.add_argument("image", help="Path to input image (JPG/PNG)")
    parser.add_argument("--top", type=int, default=3, help="Number of top classes to display (default: 3)")
    args = parser.parse_args()

    predict(args.image, top_k=args.top)
