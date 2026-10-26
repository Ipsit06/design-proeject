#!/usr/bin/env python3
"""
SignBridge dataset builder
==========================
Turns a folder of labeled hand-sign IMAGES into landmark-feature samples that
the SignBridge /collect, /train and /api/samples endpoints can use.

  input/
    A/  img001.jpg img002.jpg ...
    B/  ...
    HELLO/ ...

For every image it runs MediaPipe HandLandmarker, normalizes the 21 landmarks
exactly like the app does, and writes JSON parts (+ a CSV and a report).

FEATURE LAYOUT (single hand, 63 numbers) -- must match frontend normalize.ts:
  1. take 21 landmarks (x, y, z) from MediaPipe
  2. subtract the wrist (landmark 0) from every point
  3. divide by the 3D distance wrist -> middle-finger MCP (landmark 9)
  4. flatten in landmark order: [x0,y0,z0, x1,y1,z1, ... x20,y20,z20]

Usage
-----
  pip install mediapipe opencv-python-headless numpy
  python build_dataset.py --input ./raw_images --output ./dataset --per-class 400
  python build_dataset.py --selftest

Optional upload to the backend (adjust the body shape to your validator):
  python build_dataset.py --input ./raw_images --output ./dataset \
      --upload http://localhost:4000/api/samples/bulk

Honest notes
------------
* Only images where MediaPipe actually detects a hand become samples.
  Nothing is invented. The report shows detection rate per class.
* Samples carry a `session` id (a group of consecutive images). Split
  train/validation BY SESSION, otherwise near-duplicate frames inflate accuracy.
* Public datasets differ from your webcam. Mix in your own samples from /collect
  and evaluate on your own webcam data before trusting any accuracy number.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
FEATURE_LAYOUT = "hand1_wrist_relative_scale_wrist_to_middle_mcp_xyz_x21"
FEATURE_LENGTH = 63


# --------------------------------------------------------------------------
# Feature maths (pure functions, covered by --selftest)
# --------------------------------------------------------------------------
def normalize_landmarks(points: np.ndarray) -> np.ndarray | None:
    """points: (21, 3) array. Returns flat (63,) vector or None if degenerate."""
    if points.shape != (21, 3):
        return None
    rel = points - points[0]
    scale = float(np.linalg.norm(rel[9]))
    if not math.isfinite(scale) or scale < 1e-6:
        return None
    return (rel / scale).reshape(-1)


def augment_features(vec: np.ndarray, rng: random.Random) -> np.ndarray:
    """Small rotation (about z), scale and jitter applied on normalized features."""
    pts = vec.reshape(21, 3).copy()
    angle = math.radians(rng.uniform(-15, 15))
    c, s = math.cos(angle), math.sin(angle)
    x, y = pts[:, 0].copy(), pts[:, 1].copy()
    pts[:, 0] = c * x - s * y
    pts[:, 1] = s * x + c * y
    pts *= rng.uniform(0.95, 1.05)
    pts += np.array([rng.gauss(0, 0.01) for _ in range(63)]).reshape(21, 3)
    return pts.reshape(-1)


# --------------------------------------------------------------------------
# MediaPipe
# --------------------------------------------------------------------------
def ensure_model(path: Path) -> Path:
    if path.exists():
        return path
    print(f"Downloading hand landmarker model to {path} ...")
    path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(MODEL_URL, path)
    return path


def make_detector(model_path: Path, min_conf: float):
    from mediapipe.tasks.python import BaseOptions, vision

    options = vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=min_conf,
        min_hand_presence_confidence=min_conf,
    )
    return vision.HandLandmarker.create_from_options(options)


def extract_features(detector, image_path: Path) -> np.ndarray | None:
    import cv2
    import mediapipe as mp

    bgr = cv2.imread(str(image_path))
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    candidates = [rgb]
    if max(rgb.shape[:2]) < 900:
        candidates.append(cv2.resize(rgb, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC))

    for candidate in candidates:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=candidate)
        result = detector.detect(mp_image)
        if result.hand_landmarks:
            lm = result.hand_landmarks[0]
            pts = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float64)
            normalized = normalize_landmarks(pts)
            if normalized is not None:
                return normalized
    return None


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def list_labels(root: Path) -> dict[str, list[Path]]:
    labels: dict[str, list[Path]] = {}
    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        # Public ISL downloads commonly group images below participant folders
        # (for example, ``afraid/User_1/*.jpg``). Keep the top-level folder as
        # the label while also accepting the original flat layout.
        if d.name.lower() == "extracted":
            continue
        files = sorted(f for f in d.rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_EXTS)
        if files:
            labels[d.name] = files
    return labels


def build(args) -> int:
    root = Path(args.input)
    if not root.is_dir():
        print(f"Input folder not found: {root}")
        return 1
    labels = list_labels(root)
    if not labels:
        print("No label sub-folders with images found.")
        return 1

    rng = random.Random(args.seed)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    detector = make_detector(ensure_model(Path(args.model)), args.min_conf)

    samples: list[dict] = []
    report: dict[str, dict] = {}

    for label, files in labels.items():
        files = files[:]
        rng.shuffle(files)
        files = files[: args.max_images_per_class]
        kept = 0
        tried = 0
        for idx, f in enumerate(files):
            if kept >= args.per_class:
                break
            tried += 1
            vec = extract_features(detector, f)
            if vec is None:
                continue
            session = session_id_for_image(label, f, kept, args.session_size)
            samples.append(make_sample(label, vec, session, "image_dataset", f.name))
            kept += 1
            for _ in range(args.augment_copies):
                if kept >= args.per_class:
                    break
                samples.append(
                    make_sample(label, augment_features(vec, rng), session, "augmented", f.name)
                )
                kept += 1
        report[label] = {
            "images_tried": tried,
            "samples_kept": kept,
            "detection_rate": round(kept / tried, 3) if tried else 0.0,
            "below_target": kept < args.per_class,
        }
        print(f"{label:>12}: kept {kept:>5} / target {args.per_class} (tried {tried})")

    if args.max_total and len(samples) > args.max_total:
        rng.shuffle(samples)
        samples = samples[: args.max_total]

    write_outputs(out, samples, report, args)
    print(f"\nTotal samples: {len(samples)}  ->  {out.resolve()}")
    if args.upload:
        upload(args.upload, samples, args.upload_chunk)
    return 0


def make_sample(label, vec, session, source, origin) -> dict:
    return {
        "label": label,
        "kind": "static",
        "features": [round(float(v), 6) for v in vec],
        "handsCount": 1,
        "lighting": "normal",
        "session": session,
        "sessionId": session,
        "source": source,
        "origin": origin,
    }


def session_id_for_image(label: str, image_path: Path, fallback_index: int, session_size: int) -> str:
    """Return a stable recording/session id from the public dataset filename."""
    tokens = image_path.stem.split("_")
    if len(tokens) >= 4:
        # Dataset convention: word_image_participant_sample.
        return f"{label}-{tokens[-2]}-{tokens[-1]}"
    return f"{label}-g{fallback_index // session_size}"


def write_outputs(out: Path, samples, report, args) -> None:
    meta = {
        "featureLayout": FEATURE_LAYOUT,
        "featureLength": FEATURE_LENGTH,
        "totalSamples": len(samples),
        "note": "Landmarks extracted by MediaPipe from real images. "
        "Samples marked 'augmented' are perturbed copies, not new real examples.",
    }
    for i in range(0, len(samples), args.part_size):
        part = samples[i : i + args.part_size]
        name = out / f"samples_part_{i // args.part_size + 1:03d}.json"
        name.write_text(json.dumps({**meta, "samples": part}), encoding="utf-8")

    with open(out / "samples.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["label", "session", "source"] + [f"f{i}" for i in range(FEATURE_LENGTH)])
        for s in samples:
            w.writerow([s["label"], s["session"], s["source"]] + s["features"])

    per_label = defaultdict(int)
    n_aug = 0
    for s in samples:
        per_label[s["label"]] += 1
        n_aug += s["source"] == "augmented"
    (out / "report.json").write_text(
        json.dumps(
            {
                **meta,
                "samplesPerLabel": dict(per_label),
                "augmentedSamples": n_aug,
                "realSamples": len(samples) - n_aug,
                "perClass": report,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def upload(url: str, samples, chunk: int) -> None:
    for i in range(0, len(samples), chunk):
        body = json.dumps({"samples": samples[i : i + chunk]}).encode()
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                print(f"uploaded {i}-{i + chunk}: HTTP {r.status}")
        except Exception as e:  # noqa: BLE001
            print(f"upload failed at {i}: {e}")
            print("Check the body shape/size limit expected by POST /api/samples/bulk.")
            return


# --------------------------------------------------------------------------
# Self-test (no webcam, no dataset, no model download needed)
# --------------------------------------------------------------------------
def selftest() -> int:
    rng = np.random.default_rng(0)
    pts = rng.normal(size=(21, 3))
    v = normalize_landmarks(pts)
    assert v is not None and v.shape == (63,)
    assert np.allclose(v[:3], 0), "wrist must be at origin"
    assert abs(np.linalg.norm(v.reshape(21, 3)[9]) - 1) < 1e-9, "scale reference must be 1"
    # translation + scale invariance
    v2 = normalize_landmarks(pts * 3.7 + np.array([5, -2, 1]))
    assert np.allclose(v, v2), "features must be translation/scale invariant"
    # degenerate input rejected
    assert normalize_landmarks(np.zeros((21, 3))) is None
    assert normalize_landmarks(np.zeros((20, 3))) is None
    # augmentation keeps shape and stays close
    a = augment_features(v, random.Random(1))
    assert a.shape == (63,) and np.linalg.norm(a - v) < 5
    print("selftest OK: normalization, invariance, degenerate handling, augmentation")
    return 0


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--input", help="folder with one sub-folder of images per label")
    p.add_argument("--output", default="./dataset")
    p.add_argument("--model", default="./hand_landmarker.task", help="path (auto-downloaded if missing)")
    p.add_argument("--per-class", type=int, default=900, help="max samples per label")
    p.add_argument("--max-images-per-class", type=int, default=900)
    p.add_argument("--max-total", type=int, default=0, help="cap total samples (0 = no cap)")
    p.add_argument("--min-conf", type=float, default=0.5)
    p.add_argument("--augment-copies", type=int, default=0, help="perturbed copies per real sample")
    p.add_argument("--session-size", type=int, default=50, help="images per session group")
    p.add_argument("--part-size", type=int, default=1000, help="samples per JSON part file")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--upload", help="POST chunks to this URL, e.g. http://localhost:4000/api/samples/bulk")
    p.add_argument("--upload-chunk", type=int, default=500)
    p.add_argument("--selftest", action="store_true")
    return p.parse_args()


if __name__ == "__main__":
    a = parse_args()
    if a.selftest:
        sys.exit(selftest())
    if not a.input:
        print("--input is required (or use --selftest)")
        sys.exit(2)
    sys.exit(build(a))
