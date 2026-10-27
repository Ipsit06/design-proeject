import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.regularizers import l2

import matplotlib.pyplot as plt

# Define data directory and gesture labels
DATA_DIR = "gesture_data"
GESTURES = ["open_palm", "fist", "two_fingers", "pointing",
            "thumbs_up", "thumbs_down", "victory", "ok_sign", "pinch"]

# Load dataset
X, y = [], []
for idx, gesture in enumerate(GESTURES):
    path = os.path.join(DATA_DIR, f"{gesture}.npy")
    if os.path.exists(path):
        data = np.load(path)
        X.append(data)
        y.append(np.full(len(data), idx))

X = np.concatenate(X)
y = np.concatenate(y)

# One-hot encode labels
y_cat = to_categorical(y, num_classes=len(GESTURES))

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(X, y_cat, test_size=0.2, random_state=42)

# Model architecture
model = Sequential([
    Dense(128, activation='relu', kernel_regularizer = l2(0.0005), input_shape=(X.shape[1],)),
    Dropout(0.3),
    Dense(64, activation='relu',kernel_regularizer = l2(0.0005)),
    Dropout(0.3),
    Dense(len(GESTURES), activation='softmax')
])

# Compile model
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Train model
history = model.fit(X_train, y_train, validation_data=(X_test, y_test),
                    epochs=30, batch_size=32, verbose=1)

# Save model
model.save("gesture_model.h5")
print("\n✅ Model trained and saved as gesture_model.h5")

# ===============================
#       EVALUATION SECTION
# ===============================

# Predict on test data
y_pred_probs = model.predict(X_test)
y_pred = np.argmax(y_pred_probs, axis=1)
y_true = np.argmax(y_test, axis=1)

# Calculate metrics
acc = accuracy_score(y_true, y_pred)
cm = confusion_matrix(y_true, y_pred)
report = classification_report(y_true, y_pred, target_names=GESTURES, digits=4)

# Print results
print("\n📊 Model Evaluation Metrics:")
print(f"Accuracy: {acc * 100:.2f}%")
print("\nConfusion Matrix:")
print(cm)
print("\nDetailed Classification Report (Precision, Recall, F1-Score):")
print(report)



plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Training vs Validation Accuracy')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.show()
