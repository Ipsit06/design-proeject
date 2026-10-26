#!/usr/bin/env python3
"""
Download the ISL Real-Life Words dataset from Mendeley Data (s6kgb6r3ss)
and organise it into label sub-folders for build_dataset.py.
"""
import json
import sys
import zipfile
import urllib.request
import shutil
from pathlib import Path

DATASET_ID = "s6kgb6r3ss"
DATASET_PAGE = "https://data.mendeley.com/datasets/s6kgb6r3ss/1"
# The Mendeley public API is addressed by dataset id, not DOI.
API_URL = f"https://data.mendeley.com/public-api/datasets/{DATASET_ID}"
RAW_DIR = Path("raw_isl_dataset")
ORGANISED_DIR = Path("raw_images")
HTTP_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "SignBridge-ISL-Dataset-Downloader/1.0",
}


def fetch_metadata():
    print(f"Fetching dataset metadata from {API_URL} ...")
    req = urllib.request.Request(API_URL, headers=HTTP_HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def download_files(meta):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = meta.get("files", [])
    if not files:
        print(f"Please download the dataset manually from:\n  {DATASET_PAGE}")
        print(f"Extract it into: {RAW_DIR.resolve()}")
        return False

    print(f"Found {len(files)} file(s) in dataset.")
    for f in files:
        name = f.get("filename") or f.get("name", "unknown")
        url = f.get("download_url") or f.get("file_url") or f.get("content_details", {}).get("download_url")
        if not url:
            print(f"  [SKIP] No download URL for {name}")
            continue
        dest = RAW_DIR / name
        if dest.exists():
            print(f"  [EXISTS] {name}")
            continue
        print(f"  Downloading {name} ...")
        try:
            request = urllib.request.Request(url, headers=HTTP_HEADERS)
            with urllib.request.urlopen(request, timeout=120) as response, dest.open("wb") as output:
                shutil.copyfileobj(response, output)
            print(f"  -> saved {dest} ({dest.stat().st_size / 1024 / 1024:.1f} MB)")
        except Exception as e:
            print(f"  [ERROR] {name}: {e}")
    return True


def extract_zips():
    """Extract any .zip files found in RAW_DIR."""
    for zf in RAW_DIR.glob("*.zip"):
        print(f"Extracting {zf.name} ...")
        with zipfile.ZipFile(zf, 'r') as z:
            z.extractall(RAW_DIR)
        print(f"  -> extracted to {RAW_DIR}")


def organise_into_label_folders():
    """
    ISL dataset naming convention: ISLword_X_YYYY_Z.jpg
    e.g. afraid_001_P001_1.jpg -> label = 'afraid'

    Also handles case where images are already in sub-folders by label.
    """
    ORGANISED_DIR.mkdir(parents=True, exist_ok=True)

    # Check if already organised into sub-folders
    subdirs = [d for d in RAW_DIR.rglob("*") if d.is_dir()]
    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    # Collect all images recursively
    all_images = list(RAW_DIR.rglob("*"))
    all_images = [f for f in all_images if f.is_file() and f.suffix.lower() in image_exts]

    if not all_images:
        print(f"No images found in {RAW_DIR}. Check the download.")
        return False

    print(f"Found {len(all_images)} images total.")

    # Check if parent folder names are already labels (sub-folder structure)
    parent_names = set(f.parent.name for f in all_images)
    if len(parent_names) > 3 and all(not n.startswith("raw") for n in parent_names):
        # Already in label sub-folders
        print("Images appear to already be in label sub-folders.")
        for img in all_images:
            label = img.parent.name.upper()
            dest_dir = ORGANISED_DIR / label
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / img.name
            if not dest.exists():
                shutil.copy2(img, dest)
    else:
        # Parse label from filename: first token before '_'
        for img in all_images:
            stem = img.stem
            parts = stem.split("_")
            if len(parts) >= 2:
                label = parts[0].upper()
            else:
                label = stem.upper()

            dest_dir = ORGANISED_DIR / label
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / img.name
            if not dest.exists():
                shutil.copy2(img, dest)

    # Report
    labels = sorted(d.name for d in ORGANISED_DIR.iterdir() if d.is_dir())
    print(f"\nOrganised into {len(labels)} label folders:")
    for label in labels:
        count = len(list((ORGANISED_DIR / label).iterdir()))
        print(f"  {label:>15}: {count} images")

    return True


def main():
    print("=" * 60)
    print("ISL Dataset Downloader for SignBridge")
    print("=" * 60)

    meta = None
    try:
        meta = fetch_metadata()
    except Exception as e:
        print(f"API fetch failed: {e}")

    downloaded = False
    if meta:
        downloaded = download_files(meta)

    if downloaded:
        extract_zips()

    if not any(RAW_DIR.rglob("*.jpg")) and not any(RAW_DIR.rglob("*.png")):
        print(f"\nNo images found yet in {RAW_DIR.resolve()}.")
        print("Please download the dataset manually:")
        print(f"  1. Go to: https://data.mendeley.com/datasets/s6kgb6r3ss/1")
        print(f"  2. Click 'Download' to get the ZIP files")
        print(f"  3. Extract the ZIP contents into: {RAW_DIR.resolve()}")
        print(f"  4. Re-run this script: python {sys.argv[0]}")
        return 1

    if not organise_into_label_folders():
        return 1

    print(f"\n{'=' * 60}")
    print(f"Dataset ready at: {ORGANISED_DIR.resolve()}")
    print(f"\nNext step — run the feature extractor:")
    print(f"  pip install mediapipe opencv-python-headless")
    print(f"  python build_dataset.py --input ./raw_images --output ./dataset --per-class 900 --augment-copies 1")
    print(f"\nThen upload to SignBridge:")
    print(f"  python build_dataset.py --input ./raw_images --output ./dataset --per-class 900 --upload http://localhost:4000/api/samples/bulk")
    return 0


if __name__ == "__main__":
    sys.exit(main())
