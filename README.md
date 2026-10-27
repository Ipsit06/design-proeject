# SignBridge v2 — Harshil Hand Gesture Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![MediaPipe Tasks Vision](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-orange.svg)](https://developers.google.com/mediapipe)

**SignBridge v2** is a browser-native hand gesture recognition application built around two real trained neural networks from [harshil585/Hand_Gestures](https://github.com/harshil585/Hand_Gestures).

All inference runs **100% in the browser** — video frames never leave the device.

---

## Models

### 1. ASL Writing Mode — `asl_model.h5`
- **Architecture:** Dense MLP — 63 → 256 (ReLU) → 128 (ReLU) → 26 (Softmax)
- **Classes:** A–Z (26 ASL hand shapes)
- **Input:** 63-feature normalized landmark vector (wrist-relative + max-absolute scaling)
- **Stabilization:** 5-frame hold before committing a letter

### 2. HCI Gesture Studio — `gesture_model.h5`
- **Architecture:** Dense MLP — 63 → 128 (ReLU) → 64 (ReLU) → 9 (Softmax)
- **Classes:** `open_palm`, `fist`, `two_fingers`, `pointing`, `thumbs_up`, `thumbs_down`, `victory`, `ok_sign`, `pinch`
- **HCI Actions:**
  | Gesture | Action |
  |---|---|
  | `thumbs_up` | Volume Up (+10%) |
  | `thumbs_down` | Volume Down (-10%) |
  | `open_palm` | Scroll Up |
  | `two_fingers` | Cursor Tracking Mode |
  | `pinch` | Left Click |
  | `ok_sign` | Right Click |
  | `victory` | Zoom Mode |
  | `fist` | Idle / Deactivate |

---

## Feature Normalization

Matches Harshil's `realtime_control.py` exactly:

```
1. landmarks = [21 × (x, y, z)]  from MediaPipe HandLandmarker
2. landmarks -= landmarks[0]      # translate wrist to origin
3. max_val = max(|landmarks|)
4. landmarks /= max_val           # max-absolute scaling
5. flatten → 63 floats
```

---

## Privacy Model

```
[Webcam] → [MediaPipe WASM] → [63D Feature Extractor] → [MLP Inference] → [Text Output]
                                     ↑
                              Frames NEVER leave browser.
                    Only recognized text tokens reach the backend.
```

---

## Application Routes

| Route | Page | Description |
|---|---|---|
| `/` | **Dashboard** | Live system stats, recent translations, model info |
| `/translator` | **Translator** | ASL Writing Mode + HCI Gesture Studio |
| `/history` | **History** | Chronological translation log |
| `/gestures` | **Gesture Library** | ASL Alphabet + HCI gesture catalog |
| `/about` | **About** | Architecture and model documentation |
| `/settings` | **Settings** | Confidence, speech, mode toggles |

---

## Backend REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (version, uptime, DB status) |
| `GET` | `/api/history` | Get translation history |
| `POST` | `/api/history` | Save translation record |
| `GET` | `/api/gestures` | List gesture/sign vocabulary |
| `GET` | `/api/settings` | Get app settings |
| `PUT` | `/api/settings` | Update settings |
| `POST` | `/api/llm/assist` | Heuristic token→sentence assembler |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET/POST` | `/api/samples` | Landmark sample storage |
| `GET/POST` | `/api/models` | Trained model registry |
| `GET/POST` | `/api/eval-runs` | Evaluation run records |

---

## Running Locally

```bash
# Install dependencies
npm install

# Start both servers (backend :4000, frontend :5173)
npm run dev -w backend
npm run dev -w frontend
```

Then open **http://localhost:5173**

---

## Running Tests

```bash
npm test -w backend   # 13 tests, all passing
```

---

## Honest Limitations

- **ASL letters J and Z** involve movement (not static poses). The model was trained on static frames, so these letters may have reduced accuracy.
- **Lighting sensitivity:** Backlighting and low contrast will degrade landmark quality.
- **Single-hand only:** Inference uses the first detected hand. Two-hand signs are not modeled.
- **Not a full sign-language translator:** This app recognizes hand shapes from Harshil's trained vocabulary. It does not cover sentence-level grammar, facial grammar, or non-manual markers used in fluent ASL.
