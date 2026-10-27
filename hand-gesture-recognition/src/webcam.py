"""
webcam.py - Real-time Hand Gesture Recognition using OpenCV webcam feed.

Usage:
    cd hand-gesture-recognition
    python src/webcam.py
    python src/webcam.py --camera 0
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import numpy as np
from tensorflow import keras

from config import BEST_MODEL_PATH, LABELS_PATH, IMG_SIZE


def load_class_names() -> list[str]:
    if not os.path.exists(LABELS_PATH):
        raise FileNotFoundError(f"Class names file not found at: {LABELS_PATH}")
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def preprocess_frame(roi_bgr: np.ndarray) -> np.ndarray:
    """Converts OpenCV BGR ROI to model-ready RGB tensor."""
    rgb = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, IMG_SIZE, interpolation=cv2.INTER_AREA)
    arr = resized.astype(np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def main(camera_index: int = 0) -> None:
    if not os.path.exists(BEST_MODEL_PATH):
        print(f"[webcam] ERROR: Model not found at: {BEST_MODEL_PATH}")
        print("Please train the model first by running: python run_train.py")
        sys.exit(1)

    classes = load_class_names()
    print(f"[webcam] Loading model from: {BEST_MODEL_PATH} ...")
    model = keras.models.load_model(BEST_MODEL_PATH, compile=False)
    print(f"[webcam] Model loaded successfully! {len(classes)} gesture classes ready.")

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[webcam] ERROR: Could not open camera (index={camera_index}).")
        print("If you do not have a connected webcam, test static images using:")
        print("  python src/predict.py <path_to_image>")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("\n" + "=" * 50)
    print("  WEBCAM GESTURE RECOGNITION ACTIVE")
    print("  Controls:")
    print("    'q' -> Exit webcam cleanly")
    print("    's' -> Save annotated frame screenshot")
    print("=" * 50 + "\n")

    history: list[str] = []
    smoothing_window = 5
    frame_idx = 0
    stable_label = "Waiting..."
    stable_conf = 0.0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[webcam] Failed to grab frame from camera. Exiting.")
            break

        frame_idx += 1
        h, w = frame.shape[:2]

        # Define center square ROI
        sq = int(min(h, w) * 0.75)
        y1 = (h - sq) // 2
        x1 = (w - sq) // 2
        y2 = y1 + sq
        x2 = x1 + sq
        roi = frame[y1:y2, x1:x2]

        # Draw green bounding box around ROI
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 0), 2)

        # Run inference every 2 frames for smooth performance
        if frame_idx % 2 == 0:
            x_input = preprocess_frame(roi)
            probs = model.predict(x_input, verbose=0)[0]
            top_idx = int(np.argmax(probs))
            top_conf = float(probs[top_idx])
            top_label = classes[top_idx]

            history.append(top_label)
            if len(history) > smoothing_window:
                history.pop(0)

            stable_label = max(set(history), key=history.count)
            stable_conf = top_conf

        # HUD overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (320, 110), (20, 20, 20), -1)
        frame = cv2.addWeighted(overlay, 0.7, frame, 0.3, 0)

        cv2.putText(frame, f"Gesture: '{stable_label}'", (25, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 120), 2)
        cv2.putText(frame, f"Confidence: {stable_conf * 100:.1f}%", (25, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 220), 1)
        cv2.putText(frame, "Place hand in green square | q: Quit | s: Screenshot",
                    (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (240, 240, 240), 1)

        cv2.imshow("Hand Gesture Recognition (MobileNetV2)", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            screenshot_path = os.path.join(
                os.path.dirname(BEST_MODEL_PATH), "..", "outputs", f"webcam_capture_{frame_idx}.png"
            )
            cv2.imwrite(screenshot_path, frame)
            print(f"[webcam] Screenshot saved to: {screenshot_path}")

    cap.release()
    cv2.destroyAllWindows()
    print("[webcam] Clean shutdown complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Webcam real-time gesture recognition")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index (default: 0)")
    args = parser.parse_args()
    main(camera_index=args.camera)
