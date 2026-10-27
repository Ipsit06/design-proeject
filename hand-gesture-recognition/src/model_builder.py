"""
model_builder.py - MobileNetV2 Transfer Learning model for Hand Gesture Recognition.
Uses ImageNet pretrained weights cached locally in models/mobilenet_v2_weights.h5.
"""
from __future__ import annotations

import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from config import IMG_SIZE, DROPOUT_RATE, LEARNING_RATE, MODELS_DIR

LOCAL_WEIGHTS = os.path.join(MODELS_DIR, "mobilenet_v2_weights.h5")


def build_model(num_classes: int) -> keras.Model:
    """Builds and compiles MobileNetV2 transfer learning model."""
    inputs = keras.Input(shape=(*IMG_SIZE, 3), name="input_image")

    # Gentle orientation-preserving data augmentations
    x = layers.RandomTranslation(0.05, 0.05)(inputs)
    x = layers.RandomZoom(0.05)(x)

    # MobileNetV2 preprocessing: scales [0, 1] inputs to [-1, 1]
    x_pre = keras.applications.mobilenet_v2.preprocess_input(x * 255.0)

    # Base MobileNetV2 feature extractor
    base = keras.applications.MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights=None,
    )
    if os.path.exists(LOCAL_WEIGHTS):
        base.load_weights(LOCAL_WEIGHTS)
        print(f"[model_builder] Loaded pretrained ImageNet weights from: {LOCAL_WEIGHTS}")
    else:
        print("[model_builder] WARNING: Local weights not found, using initialized weights.")

    # Freeze base model for feature extraction
    base.trainable = False

    feat = base(x_pre, training=False)
    pooled = layers.GlobalAveragePooling2D(name="global_avg_pool")(feat)
    drop1 = layers.Dropout(DROPOUT_RATE)(pooled)
    dense1 = layers.Dense(128, activation="relu", kernel_regularizer=keras.regularizers.l2(1e-4))(drop1)
    bn1 = layers.BatchNormalization()(dense1)
    drop2 = layers.Dropout(0.3)(bn1)
    outputs = layers.Dense(num_classes, activation="softmax", name="gesture_output")(drop2)

    model = keras.Model(inputs=inputs, outputs=outputs, name="gesture_mobilenetv2")
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model
