"""
webcam_emoji.py - Real-Time Emoji Hand Gesture Recognition & Communication System.

Features:
- Real-time video inference for 30 distinct emoji hand gestures
- Dual-mode framing: 1-hand square ROI vs 2-hand wide ROI
- Rolling temporal smoothing (majority vote over N frames)
- Confidence thresholding with UNKNOWN state handling
- Native emoji rendering on HUD via Windows TrueType Segoe UI Emoji font
- Emoji Communication Mode:
    - Build emoji message sentences (e.g., "👍 ❤️ 🙏")
    - Append ('a' or SPACE)
    - Undo last emoji ('u' or BACKSPACE)
    - Clear message ('c')
    - Copy to clipboard & console ('y' or ENTER)
    - Toggle ROI box ('t' or TAB)
    - Quit ('q' or ESC)

Usage:
    cd hand-gesture-recognition
    python src/webcam_emoji.py
    python src/webcam_emoji.py --camera 0 --threshold 0.60
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import subprocess
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from config import (
    EMOJI_MODEL_PATH, EMOJI_LABELS_PATH, IMG_SIZE,
)
from emoji_catalog import CLASS_MAP, get_class_by_id, EMOJI_CLASSES

from tensorflow import keras

# Segoe UI Emoji font path on Windows
WINDOWS_EMOJI_FONT = "C:/Windows/Fonts/seguiemj.ttf"
FALLBACK_FONT = "C:/Windows/Fonts/arial.ttf"


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        if os.path.exists(font_path):
            return ImageFont.truetype(font_path, size)
    except Exception:
        pass
    try:
        return ImageFont.truetype(FALLBACK_FONT, size)
    except Exception:
        return ImageFont.load_default()


def copy_to_clipboard(text: str) -> bool:
    """Copies UTF-8 string to Windows clipboard using clip.exe."""
    try:
        process = subprocess.Popen(["clip.exe"], stdin=subprocess.PIPE, shell=True)
        process.communicate(text.encode("utf-16le"))
        return True
    except Exception as e:
        print(f"[webcam_emoji] Clipboard copy error: {e}")
        return False


def draw_hud_with_emojis(
    frame_bgr: np.ndarray,
    emoji_str: str,
    name_str: str,
    conf_str: str,
    conf_val: float,
    hands_str: str,
    message_str: str,
    status_msg: str,
    roi_mode: str,
    font_large: ImageFont.FreeTypeFont,
    font_med: ImageFont.FreeTypeFont,
    font_small: ImageFont.FreeTypeFont,
) -> np.ndarray:
    """Renders sleek glassmorphic HUD banners with crisp native emoji fonts."""
    h, w = frame_bgr.shape[:2]

    # Overlay layer for translucent glassmorphic banners
    overlay = frame_bgr.copy()

    # Top banner for prediction
    cv2.rectangle(overlay, (0, 0), (w, 100), (20, 22, 28), -1)
    # Bottom banner for communication message buffer
    cv2.rectangle(overlay, (0, h - 90), (w, h), (20, 22, 28), -1)

    # Blend overlay with original frame (alpha = 0.82)
    cv2.addWeighted(overlay, 0.82, frame_bgr, 0.18, 0, frame_bgr)

    # Convert to PIL Image for rendering Unicode emoji glyphs
    rgb_img = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb_img)
    draw = ImageDraw.Draw(pil_img)

    # 1. Top Banner Elements
    # Prominent Emoji Icon
    draw.text((20, 15), emoji_str, font=font_large, fill=(255, 255, 255))

    # Gesture Name & Category
    draw.text((115, 20), name_str, font=font_med, fill=(240, 240, 240))
    subtext = f"Confidence: {conf_str}   |   Mode: {hands_str}   |   ROI: {roi_mode.upper()}"
    draw.text((115, 60), subtext, font=font_small, fill=(180, 190, 200))

    # 2. Bottom Banner - Communication Message Buffer
    msg_prefix = "Message: "
    draw.text((20, h - 75), msg_prefix, font=font_med, fill=(100, 220, 255))
    display_msg = message_str if message_str else "(empty - press 'a' or SPACE to append)"
    msg_color = (255, 255, 255) if message_str else (140, 140, 140)
    draw.text((150, h - 77), display_msg, font=font_med, fill=msg_color)

    # Status / Helper bar
    draw.text((20, h - 30), status_msg, font=font_small, fill=(0, 230, 180))

    # Convert back to OpenCV BGR
    result_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # 3. Confidence progress bar
    if conf_val > 0.0:
        bar_x1, bar_y1 = w - 180, 42
        bar_x2, bar_y2 = w - 20, 56
        cv2.rectangle(result_bgr, (bar_x1, bar_y1), (bar_x2, bar_y2), (50, 50, 50), -1)
        fill_w = int((bar_x2 - bar_x1) * min(1.0, conf_val))
        bar_color = (0, 220, 100) if conf_val >= 0.75 else ((0, 200, 255) if conf_val >= 0.60 else (100, 100, 220))
        cv2.rectangle(result_bgr, (bar_x1, bar_y1), (bar_x1 + fill_w, bar_y2), bar_color, -1)
        cv2.rectangle(result_bgr, (bar_x1, bar_y1), (bar_x2, bar_y2), (180, 180, 180), 1)

    return result_bgr


def main() -> None:
    parser = argparse.ArgumentParser(description="Real-Time Emoji Hand Gesture Recognition & Communicator")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index")
    parser.add_argument("--threshold", type=float, default=0.60, help="Minimum confidence threshold for detection")
    args = parser.parse_args()

    # Load Fonts
    font_large = load_font(WINDOWS_EMOJI_FONT, 56)
    font_med = load_font(WINDOWS_EMOJI_FONT, 24)
    font_small = load_font(WINDOWS_EMOJI_FONT, 16)

    # Check Model
    model = None
    classes = []
    if os.path.exists(EMOJI_MODEL_PATH) and os.path.exists(EMOJI_LABELS_PATH):
        try:
            print(f"[webcam_emoji] Loading emoji model: {EMOJI_MODEL_PATH} ...")
            model = keras.models.load_model(EMOJI_MODEL_PATH, compile=False)
            with open(EMOJI_LABELS_PATH, "r", encoding="utf-8") as f:
                classes = json.load(f)
            print(f"[webcam_emoji] Successfully loaded model with {len(classes)} classes!")
        except Exception as e:
            print(f"[webcam_emoji] Error loading trained model: {e}")
            model = None
    else:
        print("\n" + "!" * 65)
        print("  NOTICE: Trained emoji model not yet found at:")
        print(f"  {EMOJI_MODEL_PATH}")
        print("  Running in DEMO / INTERACTIVE CAPTURE & TEST mode.")
        print("  To train with real samples, run: python src/collect_emoji.py")
        print("  followed by: python src/train_emoji.py")
        print("!" * 65 + "\n")

    # Open Camera
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"[webcam_emoji] ERROR: Could not open camera (index={args.camera}).")
        print("Please check camera connection or specify index: --camera 1")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # UI State
    roi_mode = "1_hand"  # '1_hand' (square) or '2_hands' (wide)
    message_buffer: list[str] = []
    smoothing_queue = collections.deque(maxlen=7)
    confidence_queue = collections.deque(maxlen=7)

    current_emoji = "❓"
    current_name = "UNKNOWN"
    current_conf = 0.0
    current_hands = "1 Hand"

    status_message = "Keys: [a] Append | [u] Undo | [c] Clear | [y] Copy | [t] ROI | [q] Quit"
    status_timer = time.time()
    frame_counter = 0

    print("\n" + "=" * 65)
    print("  EMOJI GESTURE RECOGNITION & COMMUNICATION ACTIVE")
    print("  Controls:")
    print("    'a' or SPACE -> Append detected emoji to message")
    print("    'u' or BKSP  -> Undo / remove last emoji")
    print("    'c'          -> Clear communication message buffer")
    print("    'y' or ENTER -> Copy message to clipboard and print to console")
    print("    't' or TAB   -> Toggle ROI mode (1-hand square vs 2-hand wide)")
    print("    'q' or ESC   -> Exit cleanly")
    print("=" * 65 + "\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[webcam_emoji] Failed to grab frame. Exiting.")
            break

        frame_counter += 1
        h, w = frame.shape[:2]

        # Calculate ROI box
        if roi_mode == "1_hand":
            box_w, box_h = 280, 280
            x1 = (w - box_w) // 2
            y1 = (h - box_h) // 2
            roi_color = (0, 220, 100)
        else:
            box_w, box_h = 500, 310
            x1 = (w - box_w) // 2
            y1 = (h - box_h) // 2
            roi_color = (0, 180, 255)

        x2 = x1 + box_w
        y2 = y1 + box_h
        roi = frame[y1:y2, x1:x2]

        # Draw ROI target frame
        cv2.rectangle(frame, (x1, y1), (x2, y2), roi_color, 2)
        # Corner accents for sleek aesthetic
        d = 18
        for px, py in [(x1, y1), (x2, y1), (x1, y2), (x2, y2)]:
            sx = 1 if px == x1 else -1
            sy = 1 if py == y1 else -1
            cv2.line(frame, (px, py), (px + sx * d, py), (255, 255, 255), 3)
            cv2.line(frame, (px, py), (px, py + sy * d), (255, 255, 255), 3)

        # Inference every 2nd frame
        if model is not None and len(classes) > 0 and frame_counter % 2 == 0:
            rgb_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb_roi, IMG_SIZE, interpolation=cv2.INTER_AREA)
            inp = np.expand_dims(resized.astype(np.float32) / 255.0, axis=0)

            preds = model.predict(inp, verbose=0)[0]
            top_idx = int(np.argmax(preds))
            top_conf = float(preds[top_idx])
            top_class = classes[top_idx]

            smoothing_queue.append(top_class)
            confidence_queue.append(top_conf)

            # Temporal majority vote
            most_common_class, freq = collections.Counter(smoothing_queue).most_common(1)[0]
            avg_conf = float(np.mean(confidence_queue))

            # Confidence threshold check & UNKNOWN state
            if avg_conf >= args.threshold and freq >= (len(smoothing_queue) // 2):
                info = get_class_by_id(most_common_class)
                if info:
                    current_emoji = info.emoji
                    current_name = info.name
                    current_hands = "2 Hands" if (info.hands == 2 or str(info.hands).startswith("2")) else "1 Hand"
                else:
                    current_emoji = "✋"
                    current_name = most_common_class
                    current_hands = "Standard"
                current_conf = avg_conf
            else:
                current_emoji = "❓"
                current_name = "UNKNOWN (Low confidence or no hand)"
                current_conf = avg_conf
                current_hands = "Analyzing..."

        # Revert status message after 3 seconds
        if time.time() - status_timer > 3.0:
            status_message = "Keys: [a] Append | [u] Undo | [c] Clear | [y] Copy | [t] ROI | [q] Quit"

        # Render Glassmorphic HUD with Unicode Emojis
        annotated = draw_hud_with_emojis(
            frame_bgr=frame,
            emoji_str=current_emoji,
            name_str=current_name,
            conf_str=f"{current_conf * 100:.1f}%" if current_conf > 0 else "--%",
            conf_val=current_conf,
            hands_str=current_hands,
            message_str="  ".join(message_buffer),
            status_msg=status_message,
            roi_mode=roi_mode,
            font_large=font_large,
            font_med=font_med,
            font_small=font_small,
        )

        cv2.imshow("Hand Gesture Recognition - Emoji Communicator", annotated)
        key = cv2.waitKey(1) & 0xFF

        # Controls Handling
        if key in (ord('q'), 27):  # 'q' or ESC
            print("\n[webcam_emoji] Exiting.")
            break

        elif key in (ord('a'), ord(' ')):  # 'a' or SPACE -> Append emoji
            if current_emoji != "❓":
                message_buffer.append(current_emoji)
                status_message = f"Appended '{current_emoji}' to message!"
                status_timer = time.time()
                print(f"[webcam_emoji] Appended: {current_emoji} -> Full Message: {' '.join(message_buffer)}")
            else:
                status_message = "Cannot append UNKNOWN gesture. Hold gesture clearly in ROI."
                status_timer = time.time()

        elif key in (ord('u'), 8):  # 'u' or Backspace -> Undo
            if message_buffer:
                removed = message_buffer.pop()
                status_message = f"Removed last emoji: {removed}"
                print(f"[webcam_emoji] Removed: {removed} -> Remaining: {' '.join(message_buffer)}")
            else:
                status_message = "Message buffer is already empty."
            status_timer = time.time()

        elif key == ord('c'):  # 'c' -> Clear
            message_buffer.clear()
            status_message = "Message buffer cleared."
            status_timer = time.time()
            print("[webcam_emoji] Message buffer cleared.")

        elif key in (ord('y'), 13):  # 'y' or Enter -> Copy & Print
            full_msg = " ".join(message_buffer)
            if full_msg:
                copy_to_clipboard(full_msg)
                status_message = f"Copied to clipboard: \"{full_msg}\""
                print(f"\n[webcam_emoji] === COPIED MESSAGE ===\n{full_msg}\n======================\n")
            else:
                status_message = "Message buffer is empty. Nothing to copy."
            status_timer = time.time()

        elif key in (ord('t'), 9):  # 't' or TAB -> Toggle ROI mode
            roi_mode = "2_hands" if roi_mode == "1_hand" else "1_hand"
            status_message = f"ROI switched to: {roi_mode.upper()} mode"
            status_timer = time.time()

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
