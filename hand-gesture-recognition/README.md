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
# PIPELINE B: 100 GESTURE-TO-EMOJI MAPPING CATALOGUE & WEBCAM COMMUNICATOR
# -------------------------------------------------------------
# 6. Collect real webcam samples across the 100 emoji gesture classes
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

## 100 Gesture-to-Emoji Mapping Catalogue & Communication System

The system integrates a full **100 gesture-to-emoji mapping catalogue** defined in `src/emoji_catalog.py` and exported to `models/emoji_catalog.json`.

### Design Catalogue Properties
- **Total Classes:** 100 mapped gesture classes
- **Single-Hand Gestures:** 1-hand poses with automated $280 \times 280$ ROI centering
- **Two-Hand Gestures:** 2-hand poses (e.g., Folded Hands 🙏, Heart Hands 🫶, Palms Up 🤲, Open Hands 👐, Crossed Arms 🙅, Overhead OK 🙆, Clapping 👏, Hug 🤗, Fist Bump 👊, Handshake 🤝) with automated $500 \times 310$ wide ROI
- **Dynamics:** Both static hand shapes and dynamic temporal motions (e.g. Wave 👋, Clap 👏, Salute 🫡, Shrug 🤷)
- **Native TrueType HUD:** Windows Segoe UI Emoji (`seguiemj.ttf`) integration renders genuine, crisp Unicode emojis on the OpenCV video feed.

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
