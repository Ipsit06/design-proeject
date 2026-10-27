"""
setup_dataset.py -- Copies the new extracted dataset into the project's
'dataset/' directory and removes the old one if present.

Run this ONCE before training:
    cd hand-gesture-recognition
    python src/setup_dataset.py
"""
from __future__ import annotations

import os
import shutil
import sys

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_RAW_DIR    = os.path.join(BASE_DIR, "..", "new_dataset_raw", "DATASET")
TARGET_DIR     = os.path.join(BASE_DIR, "dataset")
OLD_DATA_DIRS  = [
    os.path.join(BASE_DIR, "..", "harshil585_repo"),
]


def main() -> None:
    # -- Verify new dataset exists ---------------------------------
    if not os.path.isdir(NEW_RAW_DIR):
        print(f"ERROR: New dataset not found at: {NEW_RAW_DIR}")
        print("Make sure the ZIP was extracted to new_dataset_raw/DATASET/")
        sys.exit(1)

    classes = sorted(os.listdir(NEW_RAW_DIR))
    total   = sum(
        len([f for f in os.listdir(os.path.join(NEW_RAW_DIR, c))
             if f.lower().endswith((".jpg", ".jpeg", ".png"))])
        for c in classes
    )
    print(f"[setup] New dataset -- {len(classes)} classes, {total} total images")
    print(f"[setup] Classes: {classes}")

    # -- Remove old dataset/  if it exists -------------------------
    if os.path.isdir(TARGET_DIR):
        print(f"[setup] Removing existing dataset dir: {TARGET_DIR}")
        shutil.rmtree(TARGET_DIR)

    # -- Copy new dataset into project -----------------------------
    print(f"[setup] Copying new dataset -> {TARGET_DIR} ...")
    shutil.copytree(NEW_RAW_DIR, TARGET_DIR)
    print(f"[setup] Dataset ready at: {TARGET_DIR}")

    # -- Verify copy -----------------------------------------------
    copied = sorted(os.listdir(TARGET_DIR))
    assert copied == classes, f"Mismatch after copy! {copied} vs {classes}"
    print(f"[setup] Verified: {len(copied)} class folders present.\n")
    print("[setup] Done. You can now run:  python src/train.py")


if __name__ == "__main__":
    main()
