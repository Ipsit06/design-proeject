import numpy as np
import os
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.utils import to_categorical
import string

DATA_DIR = "asl_data"
ASL_LETTERS = list(string.ascii_uppercase)

X, y = [], []
for idx, letter in enumerate(ASL_LETTERS):
    data = np.load(os.path.join(DATA_DIR, f"{letter}.npy"))
    X.append(data)
    y.append(np.full(len(data), idx))

X = np.concatenate(X)
y = np.concatenate(y)
y_cat = to_categorical(y, num_classes=len(ASL_LETTERS))

model = Sequential([
    Dense(256, activation='relu', input_shape=(X.shape[1],)),
    Dropout(0.3),
    Dense(128, activation='relu'),
    Dropout(0.3),
    Dense(len(ASL_LETTERS), activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(X, y_cat, epochs=30, batch_size=32, validation_split=0.2)
model.save("asl_model.h5")