# SignBridge v2 — AI Sign Language Translator & Model Pipeline

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00.svg)](https://www.tensorflow.org/js)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![MediaPipe Tasks Vision](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-orange.svg)](https://developers.google.com/mediapipe)

**SignBridge v2** is a modular, privacy-preserving sign language translation and browser-native machine learning pipeline. It provides real-time dual-hand landmark tracking, in-app dataset collection, client-side neural network training (TensorFlow.js), empirical validation metrics, dynamic time warping for motion signs, and optional server-side LLM sentence structuring.

---

## 1. Documented Limitation Reductions (v2 Upgrades)

| # | Documented Limitation | V2 Architecture Upgrade | Implementation |
|---|------------------------|-------------------------|----------------|
| **1** | **Limited static vocabulary** (discrete postures only, not full signed languages) | **Custom Vocabulary & Temporal Modeling** | In-app data collection (`/collect`), browser-side TF.js MLP training (`/train`), and DTW sequence modeling for continuous signs (`/translator`). |
| **2** | **Environmental constraints** (backlighting, extreme angles, occlusion degrade confidence) | **Quality Diagnostics & Invariant Features** | Real-time luminance, backlight, clipping, and scale checks (`frameQuality.ts`). View-invariant 131D normalization (wrist origin translation, scale, rotation) and training data augmentation (`augment.ts`). |
| **3** | **Generic gestures are not universal signs** (real sign languages use facial grammar and motion) | **Linguistic Vocabulary & Facial Cues** | ASL manual alphabet and core conversational signs (`AslSignLanguageAdapter.ts`). MediaPipe Face Landmarker tracking eyebrow raises/furrows for question grammar (`useFaceCues.ts`). |
| **4** | **Single-hand constraint** (two-hand coordination not analyzed) | **Dual-Hand 21-Joint Pipeline** | 131-dimension vector tracking both Left and Right hands (63 coordinates each) plus 5 inter-hand relational features (wrist distance, fingertip distance, relative height) (`extractFeatures.ts`). |

---

## 2. System Architecture & Privacy Model

```
+---------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT                                    |
|                                                                                       |
|  [Webcam Stream]                                                                      |
|         │                                                                             |
|         ▼ (Frames NEVER leave browser)                                                |
|  [MediaPipe Tasks Vision WASM] ───► Dual-Hand (2x21 joints) + Face Blendshapes       |
|         │                                                                             |
|         ▼                                                                             |
|  [131-D Feature Extractor] ──────► Wrist translation + Scale normalization            |
|         │                                                                             |
|         ├───► [Quality Diagnostics]  ───► Real-time lighting & clipping chips         |
|         ├───► [Data Collection]      ───► Export / Import / SQLite persistence        |
|         ├───► [TensorFlow.js Engine] ──► In-Browser MLP Training / IndexedDB Storage  |
|         └───► [Model Adapters]       ───► Generic, ASL, Custom Static, Custom DTW     |
|                     │                                                                 |
|                     ▼ (Only verified text tokens transmitted)                         |
+─────────────────────┼─────────────────────────────────────────────────────────────────+
                      │
                      ▼
+───────────────────────────────────────────────────────────────────────────────────────+
|                                     BACKEND API                                       |
|                                                                                       |
|  • /api/samples    (Store numeric 131D landmark vectors, labels, and metadata)        |
|  • /api/models     (Register trained model metadata and validation metrics)          |
|  • /api/eval-runs  (Record empirical robustness runs: low-light, angle, occlusion)   |
|  • /api/llm/assist (Optional server-side Gemini sentence structuring proxy)          |
|  • /api/history    (Chronological translation sessions & statistics)                  |
+───────────────────────────────────────────────────────────────────────────────────────+
```

### Storage Model
- **Numeric Vectors & Labels**: Sent to the backend REST API and stored in SQLite / resilient JSON store (`backend/data/signbridge_store.json`). Video frames and images are **never** transmitted.
- **Trained Model Weights**: Serialized and stored directly inside the browser's **IndexedDB** (`indexeddb://signbridge_model_<id>`). Models run 100% locally with zero latency or cloud dependencies.

---

## 3. Application Routes & Navigation

| Route | Page | Purpose |
|---|---|---|
| `/` | **Dashboard** | System telemetry, recent translations, active dataset metrics, and quick actions. |
| `/translator` | **Translator** | Live multi-adapter recognition (Generic, ASL, Custom Static, Custom Sequence), real-time quality alerts, experimental facial cues, chronological token assembly, and Web Speech synthesis. |
| `/collect` | **Data Collection** | Record labeled 131D landmark samples via spacebar burst or timer countdown. Supports static postures and dynamic motion sequences with real-time framing checks. |
| `/train` | **Model Training** | Train a custom TensorFlow.js neural network in the browser with live training/validation curves, data augmentation toggle, and class balance inspection. |
| `/evaluate` | **Evaluation** | Empirical confusion matrix, per-class precision/recall/F1, 50-pass latency benchmark (ms & FPS), and 5-condition environmental stress test (low-light, backlight, angle, occlusion). |
| `/history` | **History** | Searchable chronological log of translation sessions with live vs demo tags. |
| `/gestures` | **Gesture Library** | Catalog of gestures and signs with honest validation status badges (`ASL Validated`, `Generic Gesture`, `Custom Unvalidated`). |
| `/about` | **About** | System architecture layers, model adapter interface, and honest v2 boundaries. |
| `/settings` | **Settings** | Confidence threshold, hold duration, speech rate, and API toggles. |

---

## 4. Backend REST API Endpoints

### Samples (`/api/samples`)
- `GET /api/samples`: List all samples (filterable by `?label=` and `?kind=`); returns items, total, `countsPerLabel`, and `countsPerKind`.
- `POST /api/samples`: Save one landmark sample (validates 131-dimension vector length).
- `POST /api/samples/bulk`: Batch upload multiple samples.
- `DELETE /api/samples/:id`: Delete a single sample.
- `DELETE /api/samples?label=`: Delete all samples for a specific label.
- `GET /api/samples/export`: Export all dataset samples as a JSON backup.
- `POST /api/samples/import`: Import and restore a previously exported JSON dataset.

### Models (`/api/models`)
- `GET /api/models`: List all registered trained models and their validation metrics.
- `POST /api/models`: Register a new model's metadata and confusion matrix.
- `DELETE /api/models/:id`: Delete a model from the registry.

### Evaluation Runs (`/api/eval-runs`)
- `GET /api/eval-runs`: Retrieve historical evaluation benchmark runs.
- `POST /api/eval-runs`: Record an empirical condition run (`normal`, `low_light`, `backlit`, `angle`, `occluded`).

---

## 5. Prerequisites & Installation

### Requirements
- **Node.js**: `v20.x` or `v22.x` (verified up to `v24.x`).
- **npm**: `v10.x` or higher.
- **Browser**: Modern Chrome, Edge, or Brave with WebAssembly and WebGL acceleration.

### Setup Instructions
```bash
# 1. Install root and workspace dependencies
npm.cmd install

# 2. Download MediaPipe models and copy WASM assets
# (Downloads gesture_recognizer.task and face_landmarker.task to frontend/public/models/)
npm.cmd run setup

# 3. Build all workspace packages (shared, backend, frontend)
npm.cmd run build

# 4. Run tests to verify pipeline integrity
npm.cmd run test -w backend
npm.cmd run test -w frontend

# 5. Start development servers
npm.cmd run dev
```

The application will be accessible at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## 6. Five-Minute College Demonstration / Viva Script

### Step 1: In-App Data Collection (`/collect`)
1. Open `http://localhost:5173/collect` in Chrome or Edge.
2. Select or type a sign label: e.g., `THANK_YOU`.
3. Start the camera. Position your hand and observe the **Quality Guidance** chips (e.g., verifying lighting and hand scale).
4. Hold the sign and use the **Burst Recording** button (or hold the spacebar) to collect **15 samples**.
5. Change the sign label to `PLEASE` and record another **15 samples**.
6. Notice the class balance card update with sample counts.

### Step 2: Browser-Native Model Training (`/train`)
1. Navigate to `/train`.
2. Notice the dataset overview: 2 distinct classes ready (≥10 samples each).
3. Set **Epochs** to `35` and ensure **Data Augmentation** is checked.
4. Click **"Train Custom Model"**.
5. Watch the live **Loss** and **Validation Accuracy** curves plot across epochs via TensorFlow.js directly on your GPU/WASM thread.
6. When complete, note the **Real Validation Accuracy** computed on the held-out 20% test partition (never augmented).
7. The model is saved to IndexedDB and set as the active translator model.

### Step 3: Empirical Model Evaluation (`/evaluate`)
1. Navigate to `/evaluate`.
2. Review the **Confusion Matrix**:
   - Diagonal green cells represent correct classifications on held-out test data.
   - Off-diagonal red cells highlight misclassifications.
3. Review per-class **Precision**, **Recall**, and **F1-Score**.
4. Click **"Run Benchmark (50 iterations)"** to view real client latency in milliseconds and estimated FPS.
5. Click **"Run Environmental Stress Test"**:
   - The app evaluates the model against 5 real/simulated conditions: Baseline, Low Light sensor noise, Backlit contrast, Off-axis angle (±20°), and Joint occlusion.
   - Read the honest dynamic conclusion paragraph showing how data augmentation and normalization mitigate angle drift while quality checks catch sensor noise.

### Step 4: Real-Time Translation with Active Custom Model (`/translator`)
1. Navigate to `/translator`.
2. In the **Recognition Architecture Model** switcher, click **"Custom Signs (Static)"**.
3. Click **"Start Camera"**.
4. Perform the newly recorded signs (`THANK_YOU`, `PLEASE`).
5. Observe the live classifier identifying the signs with confidence scores and appending tokens to the chronological sequence tray.
6. Optional: Toggle **"Facial Cues (Exp.)"** to demonstrate eyebrow-raise detection for question markers.
7. Click **"Speak"** for Web Speech synthesis or **"AI Assist"** to format into a fluent English sentence.

---

## 7. Honest Current System Boundaries (v2)

1. **Vocabulary Scale**: Supports user-trained vocabularies (typically 5–30 signs) and standard ASL fingerspelling / basic signs. Does not support the 10,000+ signs of full natural signed languages.
2. **Sign-Language Specificity**: Signs are language-specific. A model trained on ASL does not translate Indian Sign Language (ISL) or British Sign Language (BSL). Regional dialects exist within every signed language.
3. **Grammar & Continuous Signing**: Translates isolated signs and simple signed phrases with pause boundaries. Full signed languages use spatial grammar, topicalization, and simultaneous non-manual signals that this prototype only partially models.
4. **Non-Manual Markers**: Experimental facial-expression cues (eyebrows, mouth open) detect basic question forms. Full sign language facial grammar requires dedicated training.
5. **Lighting & Background**: Real-time quality checks alert users to dim light, backlight, and hand clipping. In ideal conditions, accuracy reaches the reported benchmark; extreme conditions degrade performance.
6. **Validation Status**: Custom signs trained in-app are marked **Unvalidated** until reviewed by a fluent or native signer.

## 8. Train on the Mendeley ISL Medical-Word Dataset

The repository includes a reproducible pipeline for the 20-word Indian Sign
Language dataset at
[Mendeley Data](https://data.mendeley.com/datasets/s6kgb6r3ss/1). The dataset
contains static RGB images, so this trains the **Custom Static** recognizer; it
does not claim to translate continuous ISL grammar.

The supplied `ISL Hand Gesture Dataset.zip` is a separate alphabet dataset. It
contains an inner RAR archive with approximately 14,347 images in `A` through
`Z` folders. After extraction, this workspace has prepared those images under
`raw_alphabet_images` and converted the detectable images into
`alphabet_dataset`. The generated `alphabet_dataset\report.json` is important:
the MediaPipe landmark detector retained 1,317 images, but detection quality is
uneven across letters because many source images are small, occluded, or
partially outside the frame. Do not interpret the archive size as model
accuracy.

The valid extracted samples are already loaded into the local backend when it
is running. Start it with `npm.cmd --prefix .\backend run dev`, open `/train`,
and train only after reviewing the per-label counts. Add webcam samples for
letters with few or no detected landmarks before using them.

From the project root on a machine with Python 3.10+:

```powershell
python -m pip install mediapipe opencv-python-headless numpy
python download_isl_dataset.py
python build_dataset.py --input .\raw_images --output .\dataset --per-class 900 --augment-copies 1
```

The downloader fetches the public API metadata and all label ZIP files, then
organizes them under `raw_images\<LABEL>`. The builder extracts 63-D normalized
single-hand MediaPipe landmarks, writes `dataset\report.json`, and keeps
recording sessions in each sample so validation can hold out complete sessions.

To load the generated samples into a running backend:

```powershell
python build_dataset.py --input .\raw_images --output .\dataset --per-class 900 `
  --augment-copies 1 --upload http://localhost:4000/api/samples/bulk
```

Then open `/train`, choose the imported classes, and click **Train Custom
Model**. Select **Custom Signs (Static)** on `/translator`. The model is saved
locally in the browser's IndexedDB. Review the held-out validation accuracy and
per-class metrics in `/evaluate`; add webcam samples from `/collect` before
relying on the model in different lighting, backgrounds, or with different
signers.

## 9. Gemini-generated script

The Translator page can send only the recognized text tokens (never camera
frames) to the backend Gemini proxy. Set the key in the backend process
environment before starting it:

```powershell
$env:GEMINI_API_KEY = "your-key"
npm.cmd --prefix .\backend run dev
```

In `/translator`, collect signs and click **Generate Script**. Gemini formats
the verified sequence into a readable sentence/script and shows a short
explanation. If the key is missing or Gemini is unavailable, SignBridge uses
the local grammar assembler instead and labels the result accordingly.

The live motion flow uses one primary pipeline: MediaPipe's hand landmark
tracker runs in the browser, the recorder samples its ordered landmarks and
movement, and Gemini is used only as the interpretation/script layer. The
older custom static/sequence adapters remain available for trained local
vocabulary experiments, but they are not required for Gemini motion analysis.
