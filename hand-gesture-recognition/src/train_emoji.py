"""
train_emoji.py - Training pipeline for the 30 Emoji Hand Gesture Recognition Model.

Uses MobileNetV2 transfer learning on real webcam-recorded samples from `dataset_emoji/`.

Usage:
    cd hand-gesture-recognition
    python src/train_emoji.py
    python src/train_emoji.py --epochs 25 --batch-size 32
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

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from config import (
    DATASET_EMOJI_DIR, EMOJI_MODEL_PATH, EMOJI_LABELS_PATH,
    EMOJI_CATALOG_PATH, EMOJI_TEST_SPLIT_PATH, EMOJI_TRAINING_LOG,
    PLOTS_DIR, REPORTS_DIR, RANDOM_SEED, IMG_SIZE,
    DROPOUT_RATE, LEARNING_RATE, EARLY_STOP_PATIENCE,
)
import tensorflow as tf
from tensorflow import keras
from dataset_utils import (
    collect_paths, train_val_test_split,
    load_images_into_memory, compute_class_weights,
)
from emoji_catalog import EMOJI_CLASSES, export_catalog_json
from model_builder import build_model

tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def inspect_emoji_dataset() -> tuple[list[str], dict[str, int]]:
    """Inspects dataset_emoji directory and returns active classes and sample counts."""
    os.makedirs(DATASET_EMOJI_DIR, exist_ok=True)
    counts: dict[str, int] = {}
    active_classes: list[str] = []

    for c in EMOJI_CLASSES:
        folder = os.path.join(DATASET_EMOJI_DIR, c.class_id)
        if not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)
            cnt = 0
        else:
            files = [
                f for f in os.listdir(folder)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))
            ]
            cnt = len(files)
        counts[c.class_id] = cnt
        if cnt > 0:
            active_classes.append(c.class_id)

    return active_classes, counts


def plot_emoji_history(history: keras.callbacks.History, save_path: str) -> None:
    """Saves training and validation accuracy/loss plots."""
    acc = history.history.get("accuracy", [])
    val_acc = history.history.get("val_accuracy", [])
    loss = history.history.get("loss", [])
    val_loss = history.history.get("val_loss", [])
    epochs_range = range(1, len(acc) + 1)

    plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, "b-o", label="Training Accuracy", markersize=4)
    plt.plot(epochs_range, val_acc, "r--s", label="Validation Accuracy", markersize=4)
    plt.title("Emoji Gesture Training & Validation Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="lower right")

    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, "b-o", label="Training Loss", markersize=4)
    plt.plot(epochs_range, val_loss, "r--s", label="Validation Loss", markersize=4)
    plt.title("Emoji Gesture Training & Validation Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right")

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[train_emoji] History plot saved -> {save_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Emoji Hand Gesture Model")
    parser.add_argument("--epochs", type=int, default=25, help="Maximum training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    args = parser.parse_args()

    print("=" * 70)
    print(f"  {len(EMOJI_CLASSES)} Emoji Hand Gesture Recognition -- Training Pipeline")
    print("=" * 70)

    # Export catalog reference
    export_catalog_json(EMOJI_CATALOG_PATH)

    active_classes, counts = inspect_emoji_dataset()
    total_samples = sum(counts.values())

    print("\nDataset Status (`dataset_emoji/`):")
    print(f"  Target Emoji Classes Defined: {len(EMOJI_CLASSES)}")
    print(f"  Total Image Samples Found:    {total_samples}")
    print("-" * 70)
    print(f"{'#':<4} {'Emoji':<6} {'Name':<28} {'Hands':<9} {'Type':<8} {'Samples'}")
    print("-" * 70)
    for i, c in enumerate(EMOJI_CLASSES, 1):
        cnt = counts.get(c.class_id, 0)
        hands_str = f"{c.hands} Hand" if c.hands == 1 else f"{c.hands} Hands"
        print(f"{i:<4} {c.emoji:<6} {c.name:<28} {hands_str:<9} {c.type:<8} {cnt}")
    print("-" * 70)

    # Check sample threshold
    MIN_SAMPLES_PER_CLASS = 3
    insufficient = [c for c in EMOJI_CLASSES if counts.get(c.class_id, 0) < MIN_SAMPLES_PER_CLASS]

    if total_samples == 0 or len(active_classes) < 2:
        print("\n[train_emoji] NOTICE: Real webcam data collection required!")
        print("  In accordance with project rules, training requires actual webcam recordings.")
        print("  Please record samples using the interactive webcam collector tool:")
        print("    python src/collect_emoji.py")
        print("\n  Controls in collector:")
        print("    'c' or SPACE -> Capture sample")
        print("    'b'          -> Burst mode (5 frames)")
        print("    'd'          -> Delete last sample for retake")
        print("    'n' / 'p'    -> Next / Previous class")
        print("    'q'          -> Quit collector\n")
        print("Exiting cleanly without fabricating synthetic results.")
        return

    # If some classes have samples, determine which classes to train
    training_classes = [c.class_id for c in EMOJI_CLASSES if counts.get(c.class_id, 0) >= MIN_SAMPLES_PER_CLASS]
    if len(training_classes) < len(EMOJI_CLASSES):
        print(f"\n[train_emoji] WARNING: {len(insufficient)} classes have fewer than {MIN_SAMPLES_PER_CLASS} samples.")
        print(f"Training on {len(training_classes)} classes that meet the minimum sample threshold.")

    label_map = {cls_name: idx for idx, cls_name in enumerate(training_classes)}
    with open(EMOJI_LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(training_classes, f, indent=2)
    print(f"[train_emoji] Saved class mapping -> {EMOJI_LABELS_PATH}")

    # Collect paths and split
    paths, labels = collect_paths(DATASET_EMOJI_DIR, label_map)
    train_p, train_l, val_p, val_l, test_p, test_l = train_val_test_split(paths, labels)

    with open(EMOJI_TEST_SPLIT_PATH, "w", encoding="utf-8") as f:
        json.dump({"paths": test_p, "labels": test_l}, f, indent=2)
    print(f"[train_emoji] Test split saved -> {EMOJI_TEST_SPLIT_PATH}")

    print("\n[train_emoji] Loading image dataset into memory ...")
    x_train, y_train = load_images_into_memory(train_p, train_l)
    x_val, y_val = load_images_into_memory(val_p, val_l)
    print(f"[train_emoji] In-memory shapes: x_train={x_train.shape}, x_val={x_val.shape}")

    class_weights = compute_class_weights(train_l, len(training_classes))

    # Build model
    model = build_model(len(training_classes))

    callbacks = [
        keras.callbacks.ModelCheckpoint(
            EMOJI_MODEL_PATH, monitor="val_accuracy",
            save_best_only=True, mode="max", verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=EARLY_STOP_PATIENCE,
            restore_best_weights=True, verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, verbose=1, min_lr=1e-5,
        ),
        keras.callbacks.CSVLogger(EMOJI_TRAINING_LOG),
    ]

    print(f"\n[train_emoji] Training on {len(training_classes)} classes for up to {args.epochs} epochs ...")
    history = model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        class_weight=class_weights,
        callbacks=callbacks,
        shuffle=True,
    )

    plot_path = os.path.join(PLOTS_DIR, "emoji_training_history.png")
    plot_emoji_history(history, plot_path)
    print(f"\n[train_emoji] Emoji model training complete! Model saved -> {EMOJI_MODEL_PATH}")


if __name__ == "__main__":
    main()
