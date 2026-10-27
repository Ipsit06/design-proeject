# Hand Gesture Recognition — SignBridge Dataset

## Overview

A complete ML pipeline for recognizing **36 hand gesture classes** (digits 0–9 and ASL letters A–Z) using transfer learning on MobileNetV2.

| Property | Value |
|---|---|
| Dataset | User-provided ZIP (300×300 px JPEG images) |
| Classes | 36 (0–9, A–Z) |
| Images | 900 total (25 per class — perfectly balanced) |
| Model | MobileNetV2 + custom head (TensorFlow/Keras) |
| Input size | 128×128 RGB |

---

## Why MobileNetV2?

- Dataset is **very small** (25 images/class). Transfer learning from ImageNet is essential.
- MobileNetV2 provides strong low-level visual features (edges, textures, shapes).
- Lightweight enough to run on CPU for real-time webcam inference.
- Two-phase training: head-only → full fine-tuning prevents catastrophic forgetting.

---

## Project Structure

```
hand-gesture-recognition/
├── dataset/                  ← New dataset (36 classes, 900 images)
├── models/
│   ├── gesture_model_best.keras   ← Best checkpoint (by val accuracy)
│   ├── gesture_model_new.keras    ← Final model after all epochs
│   ├── class_labels.json          ← Ordered class list
│   ├── test_split.json            ← Held-out test paths (no leakage)
│   └── training_log.csv           ← Epoch-by-epoch metrics
├── outputs/
│   ├── plots/
│   │   ├── confusion_matrix.png
│   │   └── training_curves.png
│   └── reports/
│       ├── classification_report.txt
│       └── summary.json
├── src/
│   ├── config.py           ← All paths and hyperparameters
│   ├── dataset_utils.py    ← Data loading, stratified split, tf.data pipelines
│   ├── model_builder.py    ← MobileNetV2 model definition
│   ├── setup_dataset.py    ← Copy new dataset into place
│   ├── train.py            ← Full training pipeline
│   ├── evaluate.py         ← Metrics, confusion matrix, plots
│   ├── predict.py          ← Single-image prediction
│   └── webcam.py           ← Real-time webcam inference
└── requirements.txt
```

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# -------------------------------------------------------------
# PIPELINE A: 36 ALPHABETS & DIGITS (0-9, A-Z)
# -------------------------------------------------------------
# 2. Train the Alphabet & Digit model
python src/train.py

# 3. Evaluate on held-out test set
python src/evaluate.py

# 4. Predict a single image
python src/predict.py path/to/image.jpg

# 5. Real-time webcam recognition
python src/webcam.py

# -------------------------------------------------------------
# PIPELINE B: 30 EMOJI HAND GESTURES & COMMUNICATION MODE
# -------------------------------------------------------------
# 6. Collect real webcam samples across 30 emoji classes
python src/collect_emoji.py

# 7. Train the Emoji Gesture model
python src/train_emoji.py

# 8. Evaluate on held-out emoji test set
python src/evaluate_emoji.py

# 9. Predict single emoji image
python src/predict_emoji.py --image path/to/sample.jpg

# 10. Real-time Emoji Recognition & Communication Mode
python src/webcam_emoji.py
```

---

## 30 Emoji Hand Gesture Recognition & Communication System

### 1. Canonical 30 Emoji Classes
The emoji system features 30 non-ambiguous, anatomically defined hand gesture classes:

| # | Emoji | Gesture Name | Hand Count | Motion Type | Class ID |
|---|---|---|---|---|---|
| 1 | 👍 | Thumbs Up | 1 Hand | Static | `EMOJI_01_THUMBS_UP` |
| 2 | 👎 | Thumbs Down | 1 Hand | Static | `EMOJI_02_THUMBS_DOWN` |
| 3 | 👌 | OK Sign | 1 Hand | Static | `EMOJI_03_OK_HAND` |
| 4 | ✌️ | Peace / Victory | 1 Hand | Static | `EMOJI_04_PEACE` |
| 5 | 🤟 | Love You (ILY) | 1 Hand | Static | `EMOJI_05_LOVE_YOU` |
| 6 | 🤘 | Rock On (Horns) | 1 Hand | Static | `EMOJI_06_ROCK_ON` |
| 7 | ✋ | Raised Hand / Stop | 1 Hand | Static | `EMOJI_07_RAISED_HAND` |
| 8 | ✊ | Raised Fist | 1 Hand | Static | `EMOJI_08_RAISED_FIST` |
| 9 | 👋 | Waving Hand | 1 Hand | Dynamic | `EMOJI_09_WAVE` |
| 10 | 🫶 | Heart Hands | 2 Hands | Static | `EMOJI_10_HEART_HANDS` |
| 11 | 🙏 | Folded Hands / Please | 2 Hands | Static | `EMOJI_11_FOLDED_HANDS` |
| 12 | 🤙 | Call Me / Shaka | 1 Hand | Static | `EMOJI_12_CALL_ME` |
| 13 | ☝️ | Point Up (Palm Forward) | 1 Hand | Static | `EMOJI_13_POINT_UP_PALM_FORWARD` |
| 14 | 🤲 | Palms Up Together | 2 Hands | Static | `EMOJI_14_PALMS_UP_TOGETHER` |
| 15 | 🖐️ | Hand Splayed / Five | 1 Hand | Static | `EMOJI_15_HAND_SPLAYED` |
| 16 | 🤏 | Pinching Hand | 1 Hand | Static | `EMOJI_16_PINCH` |
| 17 | 👈 | Point Left | 1 Hand | Static | `EMOJI_17_POINT_LEFT` |
| 18 | 👉 | Point Right | 1 Hand | Static | `EMOJI_18_POINT_RIGHT` |
| 19 | 👆 | Backhand Point Up | 1 Hand | Static | `EMOJI_19_POINT_UP` |
| 20 | 👇 | Backhand Point Down | 1 Hand | Static | `EMOJI_20_POINT_DOWN` |
| 21 | 🤞 | Crossed Fingers / Luck | 1 Hand | Static | `EMOJI_21_CROSSED_FINGERS` |
| 22 | 🤫 | Shushing Face Hand | 1 Hand | Static | `EMOJI_22_SHUSHING` |
| 23 | 🤔 | Thinking Hand | 1 Hand | Static | `EMOJI_23_THINKING` |
| 24 | 💪 | Flexed Biceps | 1 Hand | Static | `EMOJI_24_FLEXED_BICEPS` |
| 25 | 🫰 | Finger Heart | 1 Hand | Static | `EMOJI_25_FINGER_HEART` |
| 26 | 👐 | Open Hands / Welcome | 2 Hands | Static | `EMOJI_26_OPEN_HANDS` |
| 27 | 🙅 | Gesture No / X-Arms | 2 Hands | Static | `EMOJI_27_GESTURE_NO` |
| 28 | 🙆 | Gesture OK / Overhead O | 2 Hands | Static | `EMOJI_28_GESTURE_OK` |
| 29 | 👏 | Clapping Hands | 2 Hands | Dynamic | `EMOJI_29_CLAPPING` |
| 30 | 🙌 | Raising Hands / Celebration | 2 Hands | Static | `EMOJI_30_RAISED_HANDS` |

---

### 2. Interactive Webcam Data Collection Tool
Run `python src/collect_emoji.py` to capture real training samples:
- **Automatic ROI Framing:** Adapts between 1-hand square box ($280 \times 280$) and 2-hand wide box ($500 \times 310$).
- **Single Capture:** Press `c` or `SPACE`.
- **Burst Capture:** Press `b` to record 5 frames in quick succession with motion variation.
- **Undo / Retake:** Press `d` to immediately delete the last captured frame if blurry or poorly positioned.
- **Cycle Classes:** Press `n` / `p` or `]` / `[` to navigate classes.
- **Quit:** Press `q` or `ESC`.

---

### 3. Real-Time Recognition & Emoji Communication Mode
Run `python src/webcam_emoji.py` to launch the communicator:
- **Glassmorphic HUD:** Translucent status bars with native Windows Segoe UI Emoji rendering.
- **Temporal Smoothing:** 7-frame rolling majority vote with confidence thresholding (default: 60%). Ambiguous poses or empty frames smoothly display `UNKNOWN`.
- **Message Builder Buffer:** Assembles recognized gestures into messages (e.g. `👍 ❤️ 🙏`).
- **Interactive Hotkeys:**
  - `a` or `SPACE`: Append current detected emoji to message.
  - `u` or `Backspace`: Undo / remove last emoji.
  - `c`: Clear entire message buffer.
  - `y` or `Enter`: Copy message to Windows clipboard and print to console.
  - `t` or `Tab`: Toggle ROI between 1-hand and 2-hand mode.
  - `q` or `ESC`: Quit application.

---

## Dataset Split

| Split | Ratio | Images |
|---|---|---|
| Train | 70% | ~630 |
| Validation | 15% | ~135 |
| Test | 15% | ~135 |

Stratified split — each class is proportionally represented in all three sets. Test paths are saved to `models/test_split.json` at training time to prevent leakage.

---

## Training Configuration

| Setting | Value |
|---|---|
| Phase 1 epochs | Up to 30 (head only) |
| Phase 2 epochs | Up to 20 (fine-tune top 30 backbone layers) |
| Early stopping patience | 8 epochs |
| Batch size | 32 |
| Phase 1 LR | 1e-3 |
| Phase 2 LR | 1e-4 |
| Augmentation | Flip, brightness, contrast, saturation, rotation ±15° |

---

## Webcam Controls

| Key | Action |
|---|---|
| `q` | Quit |
| `s` | Save screenshot |

Position your hand inside the **green square** on screen. Predictions are smoothed with a 5-frame majority-vote filter.

---

## Honest Limitations

- **25 images per class** is a very small dataset. Accuracy may be lower than datasets with hundreds of images per class. Fine-tuning from ImageNet compensates significantly, but real-world robustness depends on recording conditions.
- **Classes J and Z** in ASL involve movement (not static poses) — they may be harder to recognize from still images.
- Webcam performance depends on lighting, hand size, and background contrast.
- No MediaPipe landmark extraction is used here — the model works directly on image pixels.
