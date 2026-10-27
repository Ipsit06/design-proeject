"""
train.py - Full training pipeline for Hand Gesture Recognition with MobileNetV2.

Usage:
    cd hand-gesture-recognition
    python run_train.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import numpy as np
import tensorflow as tf
from tensorflow import keras

from config import (
    DATASET_DIR, MODEL_PATH, BEST_MODEL_PATH, LABELS_PATH,
    EPOCHS, EARLY_STOP_PATIENCE, BATCH_SIZE, RANDOM_SEED,
)
from dataset_utils import (
    discover_classes, build_label_map, save_labels,
    collect_paths, train_val_test_split,
    load_images_into_memory, compute_class_weights, print_summary,
)
from model_builder import build_model

# Reproducibility
tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def main() -> None:
    print("=" * 65)
    print("  Hand Gesture Recognition -- MobileNetV2 Transfer Pipeline")
    print("=" * 65)

    # 1. Discover dataset
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(
            f"Dataset directory not found: {DATASET_DIR}\n"
            "Run setup_dataset.py first."
        )

    classes = discover_classes(DATASET_DIR)
    label_map = build_label_map(classes)
    num_cls = len(classes)
    print(f"\n[train] Discovered {num_cls} Classes:")
    for i, c in enumerate(classes):
        count = len(os.listdir(os.path.join(DATASET_DIR, c)))
        print(f"  Class {i:>2}: '{c}' ({count} images)")

    save_labels(classes, LABELS_PATH)

    # 2. Build path lists & stratified split
    paths, labels = collect_paths(DATASET_DIR, label_map)
    train_p, train_l, val_p, val_l, test_p, test_l = train_val_test_split(paths, labels)
    print_summary(classes, train_l, val_l, test_l)

    # Save test split for evaluate.py
    test_split_path = os.path.join(os.path.dirname(LABELS_PATH), "test_split.json")
    with open(test_split_path, "w") as f:
        json.dump({"paths": test_p, "labels": test_l}, f, indent=2)
    print(f"[train] Test split saved -> {test_split_path}")

    # 3. Load images into memory
    print("\n[train] Loading image dataset into memory ...")
    x_train, y_train = load_images_into_memory(train_p, train_l)
    x_val, y_val = load_images_into_memory(val_p, val_l)
    print(f"[train] In-memory shapes: x_train={x_train.shape}, x_val={x_val.shape}")

    class_weights = compute_class_weights(train_l, num_cls)

    # 4. Build MobileNetV2 model
    model = build_model(num_cls)
    model.summary()

    # 5. Callbacks
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            BEST_MODEL_PATH, monitor="val_accuracy",
            save_best_only=True, mode="max", verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=EARLY_STOP_PATIENCE,
            restore_best_weights=True, verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, verbose=1, min_lr=1e-5,
        ),
        keras.callbacks.CSVLogger(
            os.path.join(os.path.dirname(BEST_MODEL_PATH), "training_log.csv"),
        ),
    ]

    print(f"\n[train] Training MobileNetV2 for up to {EPOCHS} epochs ...")
    history = model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        shuffle=True,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )

    # 6. Save final model
    model.save(MODEL_PATH)
    print(f"\n[train] Final verified model saved -> {MODEL_PATH}")
    print(f"[train] Best checkpoint saved      -> {BEST_MODEL_PATH}")
    print(f"[train] Class names saved           -> {LABELS_PATH}")
    print("\n[train] Training pipeline execution completed successfully!")


if __name__ == "__main__":
    main()
