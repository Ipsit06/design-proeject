"""
dataset_utils.py - Dataset inspection, split, and fast in-memory data loading.
No data leakage: split is performed at the path level before any image is read.
"""
from __future__ import annotations

import json
import os
import random
from typing import Tuple, Dict, List

import numpy as np
from PIL import Image

from config import (
    DATASET_DIR, LABELS_PATH, IMG_SIZE,
    TRAIN_RATIO, VAL_RATIO, RANDOM_SEED,
)

# Label discovery
def discover_classes(dataset_dir: str = DATASET_DIR) -> List[str]:
    """Return sorted list of class names found as sub-directories."""
    return sorted([
        d for d in os.listdir(dataset_dir)
        if os.path.isdir(os.path.join(dataset_dir, d))
    ])


def build_label_map(classes: List[str]) -> Dict[str, int]:
    return {cls: idx for idx, cls in enumerate(classes)}


def save_labels(classes: List[str], path: str = LABELS_PATH) -> None:
    with open(path, "w") as f:
        json.dump(classes, f, indent=2)
    print(f"[dataset_utils] Labels saved -> {path}")


def load_labels(path: str = LABELS_PATH) -> List[str]:
    with open(path) as f:
        return json.load(f)


# Path collection & split
def collect_paths(dataset_dir: str, label_map: Dict[str, int]) -> Tuple[List[str], List[int]]:
    paths, labels = [], []
    for cls, idx in label_map.items():
        folder = os.path.join(dataset_dir, cls)
        for fname in os.listdir(folder):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                paths.append(os.path.join(folder, fname))
                labels.append(idx)
    return paths, labels


def train_val_test_split(
    paths: List[str],
    labels: List[int],
    train_ratio: float = TRAIN_RATIO,
    val_ratio:   float = VAL_RATIO,
    seed: int = RANDOM_SEED,
) -> Tuple:
    """Stratified split - keeps class balance consistent across all three sets."""
    from collections import defaultdict

    rng = random.Random(seed)

    buckets: Dict[int, List[str]] = defaultdict(list)
    for p, l in zip(paths, labels):
        buckets[l].append(p)

    train_p, train_l = [], []
    val_p,   val_l   = [], []
    test_p,  test_l  = [], []

    for lbl, ps in buckets.items():
        rng.shuffle(ps)
        n = len(ps)
        n_train = max(1, round(n * train_ratio))
        n_val   = max(1, round(n * val_ratio))

        for p in ps[:n_train]:
            train_p.append(p); train_l.append(lbl)
        for p in ps[n_train:n_train + n_val]:
            val_p.append(p); val_l.append(lbl)
        for p in ps[n_train + n_val:]:
            test_p.append(p); test_l.append(lbl)

    return train_p, train_l, val_p, val_l, test_p, test_l


def load_images_into_memory(
    paths: List[str],
    labels: List[int],
    target_size: Tuple[int, int] = IMG_SIZE,
) -> Tuple[np.ndarray, np.ndarray]:
    """Load and normalize images directly into a numpy array for high-speed training."""
    n = len(paths)
    x = np.empty((n, target_size[0], target_size[1], 3), dtype=np.float32)
    y = np.array(labels, dtype=np.int32)

    for i, p in enumerate(paths):
        with Image.open(p) as img:
            img = img.convert("RGB")
            if img.size != target_size:
                img = img.resize(target_size, Image.Resampling.BILINEAR)
            x[i] = np.asarray(img, dtype=np.float32) / 255.0

    return x, y


def compute_class_weights(labels: List[int], num_classes: int) -> Dict[int, float]:
    counts = np.bincount(labels, minlength=num_classes)
    total  = len(labels)
    weights = {i: (total / (num_classes * max(c, 1))) for i, c in enumerate(counts)}
    return weights


def print_summary(
    classes: List[str],
    train_l: List[int],
    val_l:   List[int],
    test_l:  List[int],
) -> None:
    print("\n-- Dataset Summary ------------------------------")
    print(f"  Classes      : {len(classes)}  -> {classes}")
    print(f"  Train images : {len(train_l)}")
    print(f"  Val   images : {len(val_l)}")
    print(f"  Test  images : {len(test_l)}")
    print(f"  Total images : {len(train_l) + len(val_l) + len(test_l)}")
    print("-------------------------------------------------\n")
