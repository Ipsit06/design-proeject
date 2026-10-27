"""
config.py - Central configuration for the Hand Gesture Recognition pipeline.
All paths, hyperparameters, and constants are defined here.
"""
import os

# Base Directories
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ensure KERAS_HOME points to local workspace directory
os.environ["KERAS_HOME"] = os.path.join(BASE_DIR, ".keras")
os.makedirs(os.environ["KERAS_HOME"], exist_ok=True)
keras_json = os.path.join(os.environ["KERAS_HOME"], "keras.json")
if not os.path.exists(keras_json):
    with open(keras_json, "w", encoding="utf-8") as f:
        f.write('{\n    "floatx": "float32",\n    "epsilon": 1e-07,\n    "backend": "tensorflow",\n    "image_data_format": "channels_last"\n}\n')

DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR  = os.path.join(BASE_DIR, "models")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PLOTS_DIR   = os.path.join(OUTPUTS_DIR, "plots")
REPORTS_DIR = os.path.join(OUTPUTS_DIR, "reports")

# Model and Label Paths (exact names requested by user)
MODEL_PATH        = os.path.join(MODELS_DIR, "hand_gesture_model.keras")
BEST_MODEL_PATH   = os.path.join(MODELS_DIR, "hand_gesture_model.keras")
LABELS_PATH       = os.path.join(MODELS_DIR, "class_names.json")

# Emoji Gesture Paths
DATASET_EMOJI_DIR     = os.path.join(BASE_DIR, "dataset_emoji")
EMOJI_MODEL_PATH      = os.path.join(MODELS_DIR, "emoji_gesture_model.keras")
EMOJI_LABELS_PATH     = os.path.join(MODELS_DIR, "emoji_class_names.json")
EMOJI_CATALOG_PATH    = os.path.join(MODELS_DIR, "emoji_catalog.json")
EMOJI_TEST_SPLIT_PATH = os.path.join(MODELS_DIR, "emoji_test_split.json")
EMOJI_TRAINING_LOG    = os.path.join(MODELS_DIR, "emoji_training_log.csv")

# Image settings (128x128 RGB for MobileNetV2 feature extraction)
IMG_SIZE   = (128, 128)
BATCH_SIZE = 32

# Train / Val / Test split (Stratified 70% / 15% / 15%)
TRAIN_RATIO = 0.70
VAL_RATIO   = 0.15
TEST_RATIO  = 0.15
RANDOM_SEED = 42

# Training hyperparameters
EPOCHS              = 25
LEARNING_RATE       = 1e-3
DROPOUT_RATE        = 0.4
EARLY_STOP_PATIENCE = 6

MODEL_BACKBONE = "MobileNetV2"

os.makedirs(MODELS_DIR,  exist_ok=True)
os.makedirs(PLOTS_DIR,   exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
