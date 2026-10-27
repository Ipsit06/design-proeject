"""
evaluate.py - Load the trained MobileNetV2 hand gesture model and generate complete evaluation metrics.

Usage:
    cd hand-gesture-recognition
    python src/evaluate.py
"""
from __future__ import annotations

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, precision_score, recall_score, f1_score,
)

from config import (
    BEST_MODEL_PATH, LABELS_PATH, MODELS_DIR,
    PLOTS_DIR, REPORTS_DIR, BATCH_SIZE,
)
from dataset_utils import load_labels, load_images_into_memory


def main() -> None:
    print("=" * 65)
    print("  Hand Gesture Recognition -- Model Evaluation")
    print("=" * 65)

    # 1. Load labels and test split
    if not os.path.exists(LABELS_PATH):
        print(f"[evaluate] ERROR: Labels file not found at {LABELS_PATH}")
        return

    classes = load_labels(LABELS_PATH)
    test_split_path = os.path.join(MODELS_DIR, "test_split.json")

    if not os.path.exists(test_split_path):
        print(f"[evaluate] ERROR: Test split file not found at {test_split_path}")
        return

    with open(test_split_path) as f:
        split = json.load(f)
    test_paths, test_labels = split["paths"], split["labels"]
    print(f"[evaluate] Test sample count: {len(test_paths)} images across {len(classes)} classes")

    # 2. Load trained model
    if not os.path.exists(BEST_MODEL_PATH):
        print(f"[evaluate] ERROR: Trained model not found at {BEST_MODEL_PATH}")
        return

    model = keras.models.load_model(BEST_MODEL_PATH, compile=False)
    print(f"[evaluate] Successfully loaded model from: {BEST_MODEL_PATH}")

    # 3. Load test images into memory
    x_test, y_true = load_images_into_memory(test_paths, test_labels)

    # 4. Predict
    y_prob = model.predict(x_test, batch_size=BATCH_SIZE, verbose=1)
    y_pred = np.argmax(y_prob, axis=1)

    # 5. Core Metrics
    test_acc = accuracy_score(y_true, y_pred)
    test_prec = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    test_rec = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    test_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    print("\n" + "=" * 45)
    print("  EMPIRICAL EVALUATION RESULTS (TEST SET)")
    print("=" * 45)
    print(f"  Test Accuracy  : {test_acc * 100:.2f}%")
    print(f"  Precision (wt) : {test_prec:.4f}")
    print(f"  Recall (wt)    : {test_rec:.4f}")
    print(f"  F1-Score (wt)  : {test_f1:.4f}")
    print("=" * 45)

    # 6. Classification Report for all 36 classes
    report_text = classification_report(y_true, y_pred, target_names=classes, zero_division=0)
    print("\nDetailed Per-Class Classification Report:\n")
    print(report_text)

    report_path = os.path.join(REPORTS_DIR, "classification_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"Model: {BEST_MODEL_PATH}\n")
        f.write(f"Test Accuracy: {test_acc * 100:.2f}%\n")
        f.write(f"Precision (Weighted): {test_prec:.4f}\n")
        f.write(f"Recall (Weighted):    {test_rec:.4f}\n")
        f.write(f"F1-Score (Weighted):  {test_f1:.4f}\n\n")
        f.write("Per-Class Report:\n")
        f.write(report_text)
    print(f"[evaluate] Classification report saved -> {report_path}")

    # 7. Confusion Matrix Heatmap
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(14, 12))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=classes, yticklabels=classes,
                linewidths=0.3, ax=ax)
    ax.set_xlabel("Predicted Class", fontsize=12)
    ax.set_ylabel("True Class", fontsize=12)
    ax.set_title("Confusion Matrix - Hand Gesture Recognition (36 Classes)", fontsize=14)
    plt.tight_layout()
    cm_path = os.path.join(PLOTS_DIR, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"[evaluate] Confusion matrix plot saved -> {cm_path}")

    # 8. Training & Validation Curves
    log_path = os.path.join(MODELS_DIR, "training_log.csv")
    if os.path.exists(log_path):
        import pandas as pd
        df = pd.read_csv(log_path)
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        axes[0].plot(df["accuracy"], label="Training Accuracy", marker="o")
        axes[0].plot(df["val_accuracy"], label="Validation Accuracy", marker="s")
        axes[0].set_title("Accuracy per Epoch", fontsize=12)
        axes[0].set_xlabel("Epoch")
        axes[0].set_ylabel("Accuracy")
        axes[0].legend()
        axes[0].grid(True, linestyle="--", alpha=0.6)

        axes[1].plot(df["loss"], label="Training Loss", marker="o", color="crimson")
        axes[1].plot(df["val_loss"], label="Validation Loss", marker="s", color="orange")
        axes[1].set_title("Loss per Epoch", fontsize=12)
        axes[1].set_xlabel("Epoch")
        axes[1].set_ylabel("Loss")
        axes[1].legend()
        axes[1].grid(True, linestyle="--", alpha=0.6)

        plt.tight_layout()
        curve_path = os.path.join(PLOTS_DIR, "training_curves.png")
        plt.savefig(curve_path, dpi=150)
        plt.close()
        print(f"[evaluate] Training curves saved -> {curve_path}")

    # 9. Examples of correct and incorrect predictions
    correct_examples = []
    incorrect_examples = []
    for i in range(len(test_paths)):
        true_name = classes[y_true[i]]
        pred_name = classes[y_pred[i]]
        conf = float(y_prob[i][y_pred[i]])
        fname = os.path.basename(test_paths[i])
        record = f"{fname} | True: {true_name} | Predicted: {pred_name} (Confidence: {conf*100:.1f}%)"
        if true_name == pred_name:
            if len(correct_examples) < 10:
                correct_examples.append(record)
        else:
            if len(incorrect_examples) < 10:
                incorrect_examples.append(record)

    examples_path = os.path.join(REPORTS_DIR, "examples.txt")
    with open(examples_path, "w", encoding="utf-8") as f:
        f.write("=== CORRECT PREDICTION SAMPLES ===\n")
        f.write("\n".join(correct_examples) + "\n\n")
        f.write("=== INCORRECT PREDICTION SAMPLES ===\n")
        f.write("\n".join(incorrect_examples) + "\n")
    print(f"[evaluate] Examples report saved -> {examples_path}")

    print("\n--- Correct Prediction Samples ---")
    for ex in correct_examples[:5]:
        print("  [CORRECT] " + ex)
    print("\n--- Incorrect Prediction Samples ---")
    for ex in incorrect_examples[:5]:
        print("  [INCORRECT] " + ex)

    # 10. Summary JSON
    summary_data = {
        "test_accuracy": round(float(test_acc), 4),
        "test_precision_weighted": round(float(test_prec), 4),
        "test_recall_weighted": round(float(test_rec), 4),
        "test_f1_weighted": round(float(test_f1), 4),
        "total_test_samples": len(test_paths),
        "classes_count": len(classes),
    }
    summary_path = os.path.join(REPORTS_DIR, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)
    print(f"[evaluate] Metrics summary JSON saved -> {summary_path}")
    print("\n[evaluate] Full evaluation workflow completed successfully!")


if __name__ == "__main__":
    main()
