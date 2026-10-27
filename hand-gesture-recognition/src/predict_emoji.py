"""
predict_emoji.py - Standalone image prediction for Emoji Hand Gestures.

Usage:
    cd hand-gesture-recognition
    python src/predict_emoji.py --image path/to/sample.jpg
"""
from __future__ import annotations

import argparse
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np

from config import EMOJI_MODEL_PATH, EMOJI_LABELS_PATH, IMG_SIZE
from emoji_catalog import CLASS_MAP, get_class_by_id
from tensorflow import keras


_cached_model = None
_cached_labels = None


def load_emoji_model_and_labels():
    global _cached_model, _cached_labels
    if _cached_model is None:
        if not os.path.exists(EMOJI_MODEL_PATH):
            raise FileNotFoundError(
                f"Emoji model not found at {EMOJI_MODEL_PATH}. "
                "Please train the model first with: python src/train_emoji.py"
            )
        _cached_model = keras.models.load_model(EMOJI_MODEL_PATH, compile=False)

    if _cached_labels is None:
        if not os.path.exists(EMOJI_LABELS_PATH):
            raise FileNotFoundError(f"Emoji labels file not found at {EMOJI_LABELS_PATH}")
        with open(EMOJI_LABELS_PATH, "r", encoding="utf-8") as f:
            _cached_labels = json.load(f)

    return _cached_model, _cached_labels


def predict_emoji_array(img_rgb: np.ndarray, top_k: int = 3) -> list[dict]:
    """Predicts emoji gestures from an in-memory RGB numpy array."""
    model, classes = load_emoji_model_and_labels()

    resized = cv2.resize(img_rgb, IMG_SIZE, interpolation=cv2.INTER_AREA)
    norm = resized.astype(np.float32) / 255.0
    tensor = np.expand_dims(norm, axis=0)

    probs = model.predict(tensor, verbose=0)[0]
    sorted_indices = np.argsort(probs)[::-1][:top_k]

    results = []
    for idx in sorted_indices:
        class_id = classes[idx]
        conf = float(probs[idx])
        info = get_class_by_id(class_id)
        results.append({
            "class_id": class_id,
            "emoji": info.emoji if info else "❓",
            "name": info.name if info else class_id,
            "gesture": info.gesture if info else "",
            "hands": f"{info.hands} Hand" if (info and info.hands == 1) else ("2 Hands" if info else "unknown"),
            "type": info.type if info else "unknown",
            "confidence": conf,
            "percentage": f"{conf * 100:.2f}%",
        })

    return results


def predict_emoji_file(image_path: str, top_k: int = 3) -> list[dict]:
    """Predicts emoji gestures from an image file path."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")

    bgr = cv2.imread(image_path)
    if bgr is None:
        raise ValueError(f"Failed to read image at: {image_path}")

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return predict_emoji_array(rgb, top_k=top_k)


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict Emoji Hand Gesture from Image")
    parser.add_argument("--image", type=str, required=True, help="Path to input image file")
    parser.add_argument("--top", type=int, default=3, help="Number of top predictions to display")
    args = parser.parse_args()

    try:
        results = predict_emoji_file(args.image, top_k=args.top)
    except Exception as e:
        print(f"[predict_emoji] ERROR: {e}")
        sys.exit(1)

    print("\n" + "=" * 65)
    print(f"  Prediction Results for: {os.path.basename(args.image)}")
    print("=" * 65)
    for rank, res in enumerate(results, 1):
        print(f"  Rank #{rank}: {res['emoji']}  {res['name']:<25} ({res['percentage']})  [{res['hands']}, {res['type']}]")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
