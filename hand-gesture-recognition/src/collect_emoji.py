"""
collect_emoji.py - Interactive Webcam Data Collection Tool for 30 Emoji Gestures.

Features:
- Select and cycle through all 30 predefined emoji classes
- Dynamic ROI guidance: single-hand square vs two-hand wide framing
- Single snapshot capture ('c' / SPACE) and burst mode ('b')
- Undo / Delete last sample ('d') for quick retakes
- Live sample counters per class and across entire dataset
- Clean shutdown ('q' / ESC)

Usage:
    cd hand-gesture-recognition
    python src/collect_emoji.py
    python src/collect_emoji.py --camera 0
"""
from __future__ import annotations

import argparse
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import cv2
import numpy as np

from emoji_catalog import EMOJI_CLASSES, EmojiGestureDef

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_EMOJI_DIR = os.path.join(BASE_DIR, "dataset_emoji")


def ensure_class_directories():
    os.makedirs(DATASET_EMOJI_DIR, exist_ok=True)
    for c in EMOJI_CLASSES:
        os.makedirs(os.path.join(DATASET_EMOJI_DIR, c.class_id), exist_ok=True)


def count_samples(class_id: str) -> int:
    folder = os.path.join(DATASET_EMOJI_DIR, class_id)
    if not os.path.exists(folder):
        return 0
    return len([f for f in os.listdir(folder) if f.lower().endswith((".jpg", ".jpeg", ".png"))])


def count_total_samples() -> int:
    return sum(count_samples(c.class_id) for c in EMOJI_CLASSES)


def delete_last_sample(class_id: str) -> bool:
    folder = os.path.join(DATASET_EMOJI_DIR, class_id)
    if not os.path.exists(folder):
        return False
    files = sorted([f for f in os.listdir(folder) if f.lower().endswith((".jpg", ".jpeg", ".png"))])
    if not files:
        return False
    last_file = os.path.join(folder, files[-1])
    try:
        os.remove(last_file)
        return True
    except Exception:
        return False


def main(camera_index: int = 0) -> None:
    ensure_class_directories()
    cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        print(f"[collect_emoji] ERROR: Could not open camera {camera_index}.")
        print("Please check camera connection or specify camera index with: --camera 1")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    current_idx = 0
    total_classes = len(EMOJI_CLASSES)

    flash_frames = 0
    flash_color = (0, 255, 0)
    status_msg = "Ready to record"
    status_timer = time.time()

    print("\n" + "=" * 60)
    print("  EMOJI GESTURE WEBCAM DATA COLLECTOR")
    print("  Controls:")
    print("    'c' or SPACE -> Capture single sample")
    print("    'b'          -> Burst capture 5 frames")
    print("    'd'          -> Delete / Retake last sample")
    print("    'n' or ']'   -> Next gesture class")
    print("    'p' or '['   -> Previous gesture class")
    print("    'q' or ESC   -> Exit collector cleanly")
    print("=" * 60 + "\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[collect_emoji] Camera stream interrupted. Exiting.")
            break

        h, w = frame.shape[:2]
        current_def: EmojiGestureDef = EMOJI_CLASSES[current_idx]
        is_two_hands = (current_def.hands == 2 or str(current_def.hands).startswith("2"))
        hands_label = "2 Hands" if is_two_hands else "1 Hand"

        # ── Define ROI bounding box based on 1-hand vs 2-hands ────
        if is_two_hands:
            box_w = int(w * 0.78)
            box_h = int(h * 0.65)
        else:
            box_w = int(min(h, w) * 0.65)
            box_h = box_w

        x1 = (w - box_w) // 2
        y1 = (h - box_h) // 2
        x2 = x1 + box_w
        y2 = y1 + box_h
        roi = frame[y1:y2, x1:x2].copy()

        # ── Draw HUD Banner ──────────────────────────────────────
        hud = frame.copy()
        # Top banner
        cv2.rectangle(hud, (0, 0), (w, 105), (20, 20, 20), -1)
        # Bottom status bar
        cv2.rectangle(hud, (0, h - 38), (w, h), (15, 15, 15), -1)
        frame = cv2.addWeighted(hud, 0.75, frame, 0.25, 0)

        # Title and Gesture Class Header
        header_text = f"[{current_idx + 1:03d}/{total_classes:03d}] {current_def.name} ({hands_label})"
        cv2.putText(frame, header_text, (15, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 255, 120), 2)

        # Emoji code representation and description
        info_line = f"Key: {current_def.class_id} | Type: {current_def.type.capitalize()}"
        cv2.putText(frame, info_line, (15, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1)

        instr_line = f"Guide: {current_def.collection_procedure}"
        if len(instr_line) > 75:
            instr_line = instr_line[:72] + "..."
        cv2.putText(frame, instr_line, (15, 88), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 220, 255), 1)

        # Sample counter
        samples_this_class = count_samples(current_def.class_id)
        total_samples = count_total_samples()
        counter_text = f"Class Samples: {samples_this_class} | Total: {total_samples}"
        cv2.putText(frame, counter_text, (15, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 0), 1)

        # Hotkeys help
        keys_help = "c/SPACE: Save | b: Burst | d: Undo | n/p: Next/Prev | q: Quit"
        cv2.putText(frame, keys_help, (w - 410, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)

        # Target bounding box
        box_color = (0, 240, 0) if not is_two_hands else (255, 180, 0)
        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
        target_label = "Place Hand Inside" if not is_two_hands else "Place BOTH Hands Inside"
        cv2.putText(frame, target_label, (x1 + 10, y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 1)

        # Flash feedback on capture or delete
        if flash_frames > 0:
            cv2.rectangle(frame, (0, 0), (w, h), flash_color, 8)
            cv2.putText(frame, status_msg, (w // 2 - 140, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, flash_color, 2)
            flash_frames -= 1

        cv2.imshow("Emoji Gesture Data Collection", frame)

        key = cv2.waitKey(1) & 0xFF

        # ── Capture Single Sample ─────────────────────────────────
        if key == ord("c") or key == 32:  # 32 = SPACE
            target_folder = os.path.join(DATASET_EMOJI_DIR, current_def.class_id)
            img_name = f"image_{time.time():.6f}.jpg"
            img_path = os.path.join(target_folder, img_name)
            # Save standard 300x300 resized image matching project standard
            resized_roi = cv2.resize(roi, (300, 300), interpolation=cv2.INTER_AREA)
            cv2.imwrite(img_path, resized_roi)
            flash_frames = 4
            flash_color = (0, 255, 0)
            status_msg = f"SAVED #{samples_this_class + 1}"
            print(f"[collect_emoji] Saved -> {img_path}")

        # ── Burst Mode: 5 Samples ─────────────────────────────────
        elif key == ord("b"):
            target_folder = os.path.join(DATASET_EMOJI_DIR, current_def.class_id)
            print(f"[collect_emoji] Burst capture starting for {current_def.class_id} ...")
            for b in range(5):
                ret_b, frame_b = cap.read()
                if ret_b:
                    roi_b = frame_b[y1:y2, x1:x2].copy()
                    resized_b = cv2.resize(roi_b, (300, 300), interpolation=cv2.INTER_AREA)
                    img_name = f"image_{time.time():.6f}.jpg"
                    cv2.imwrite(os.path.join(target_folder, img_name), resized_b)
                    time.sleep(0.08)
            flash_frames = 6
            flash_color = (0, 255, 255)
            status_msg = "BURST +5 SAVED"

        # ── Delete / Retake Last Sample ───────────────────────────
        elif key == ord("d"):
            deleted = delete_last_sample(current_def.class_id)
            if deleted:
                flash_frames = 5
                flash_color = (0, 0, 255)
                status_msg = "LAST SAMPLE DELETED"
                print(f"[collect_emoji] Deleted last sample from {current_def.class_id}")
            else:
                flash_frames = 3
                flash_color = (128, 128, 128)
                status_msg = "NO SAMPLES TO DELETE"

        # ── Navigation: Next / Previous Class ─────────────────────
        elif key == ord("n") or key == ord("]"):
            current_idx = (current_idx + 1) % total_classes
        elif key == ord("p") or key == ord("["):
            current_idx = (current_idx - 1) % total_classes

        # ── Exit ──────────────────────────────────────────────────
        elif key == ord("q") or key == 27:  # 27 = ESC
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[collect_emoji] Collection tool closed cleanly.")
    print(f"[collect_emoji] Total dataset size: {count_total_samples()} samples across {total_classes} classes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Webcam Emoji Gesture Collector")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default: 0)")
    args = parser.parse_args()
    main(camera_index=args.camera)
