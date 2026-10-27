"""
evaluate_emoji.py - Model Evaluation and Metrics Pipeline for 30 Emoji Gestures.

Computes:
- Final test accuracy and loss
- Precision, recall, and F1-score for each gesture
- Confusion matrix saved to outputs/plots/emoji_confusion_matrix.png
- Comprehensive JSON report saved to outputs/reports/emoji_classification_report.json

Usage:
    cd hand-gesture-recognition
    python src/evaluate_emoji.py
"""
from __future__ import annotations

import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from config import (
    EMOJI_MODEL_PATH, EMOJI_LABELS_PATH, EMOJI_TEST_SPLIT_PATH,
    PLOTS_DIR, REPORTS_DIR, IMG_SIZE,
)
import tensorflow as tf
from tensorflow import keras
from dataset_utils import load_images_into_memory
from emoji_catalog import CLASS_MAP


def plot_emoji_confusion_matrix(
    cm: np.ndarray,
    classes: list[str],
    save_path: str,
) -> None:
    """Plots and saves the confusion matrix heatmap for emoji gestures."""
    fig, ax = plt.subplots(figsize=(max(10, len(classes) * 0.45), max(8, len(classes) * 0.45)))
    cax = ax.matshow(cm, cmap="Blues", alpha=0.85)
    plt.colorbar(cax)

    display_labels = []
    for c in classes:
        info = CLASS_MAP.get(c)
        if info:
            display_labels.append(f"{info.emoji} {info.name}")
        else:
            display_labels.append(c)

    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(display_labels, rotation=90, fontsize=8)
    ax.set_yticklabels(display_labels, fontsize=8)

    # Annotate numbers
    thresh = cm.max() / 2.0 if cm.max() > 0 else 1.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            color = "white" if val > thresh else "black"
            ax.text(j, i, str(val), ha="center", va="center", color=color, fontsize=7)

    plt.title("Emoji Gesture Recognition - Confusion Matrix", pad=20, fontsize=12, fontweight="bold")
    plt.xlabel("Predicted Class", labelpad=10, fontsize=10)
    plt.ylabel("True Class", labelpad=10, fontsize=10)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[evaluate_emoji] Confusion matrix saved -> {save_path}")


def main() -> None:
    print("=" * 70)
    print("  Emoji Hand Gesture Recognition -- Model Evaluation")
    print("=" * 70)

    if not os.path.exists(EMOJI_MODEL_PATH):
        print(f"\n[evaluate_emoji] NOTICE: Model file not found at: {EMOJI_MODEL_PATH}")
        print("Please train the model first by running:")
        print("  python src/train_emoji.py")
        return

    if not os.path.exists(EMOJI_TEST_SPLIT_PATH):
        print(f"\n[evaluate_emoji] NOTICE: Test split file not found at: {EMOJI_TEST_SPLIT_PATH}")
        print("Run src/train_emoji.py to generate test partitions.")
        return

    if not os.path.exists(EMOJI_LABELS_PATH):
        print(f"\n[evaluate_emoji] NOTICE: Labels mapping file not found at: {EMOJI_LABELS_PATH}")
        return

    with open(EMOJI_LABELS_PATH, "r", encoding="utf-8") as f:
        classes = json.load(f)

    with open(EMOJI_TEST_SPLIT_PATH, "r", encoding="utf-8") as f:
        test_split = json.load(f)

    test_paths = test_split.get("paths", [])
    test_labels = test_split.get("labels", [])

    if not test_paths:
        print("[evaluate_emoji] Test split is empty. Collect more samples and retrain.")
        return

    print(f"[evaluate_emoji] Loading model from: {EMOJI_MODEL_PATH}")
    model = keras.models.load_model(EMOJI_MODEL_PATH, compile=False)

    print(f"[evaluate_emoji] Loading {len(test_paths)} test images ...")
    x_test, y_test = load_images_into_memory(test_paths, test_labels)

    print("[evaluate_emoji] Running predictions on test dataset ...")
    preds = model.predict(x_test, verbose=0)
    y_pred = np.argmax(preds, axis=1)

    correct = int(np.sum(y_pred == y_test))
    total = len(y_test)
    test_acc = correct / total

    print("\n" + "=" * 55)
    print(f"  Final Test Accuracy: {test_acc * 100:.2f}% ({correct}/{total})")
    print("=" * 55)

    # Classification Report
    unique_labels = sorted(list(set(y_test) | set(y_pred)))
    target_names = [classes[idx] for idx in unique_labels]

    report = classification_report(
        y_test, y_pred,
        labels=unique_labels,
        target_names=target_names,
        digits=4,
        zero_division=0,
    )
    print("\nClassification Report:")
    print(report)

    # Save classification report as JSON
    report_dict = classification_report(
        y_test, y_pred,
        labels=unique_labels,
        target_names=target_names,
        output_dict=True,
        zero_division=0,
    )
    report_json_path = os.path.join(REPORTS_DIR, "emoji_classification_report.json")
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report_dict, f, indent=2)
    print(f"[evaluate_emoji] Classification report JSON -> {report_json_path}")

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=range(len(classes)))
    cm_path = os.path.join(PLOTS_DIR, "emoji_confusion_matrix.png")
    plot_emoji_confusion_matrix(cm, classes, cm_path)


if __name__ == "__main__":
    main()
