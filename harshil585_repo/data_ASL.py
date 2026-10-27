import cv2
import mediapipe as mp
import numpy as np
import os
import string

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.6)
mp_draw = mp.solutions.drawing_utils

DATA_DIR = "asl_data"
ASL_LETTERS = list(string.ascii_uppercase)  
NUM_SAMPLES = 300

os.makedirs(DATA_DIR, exist_ok=True)

def extract_features(landmarks):
    lm = np.array([[l.x, l.y, l.z] for l in landmarks])
    wrist = lm[0].copy()
    lm -= wrist
    max_val = np.max(np.abs(lm))
    if max_val > 0:
        lm /= max_val
    return lm.flatten()

cap = cv2.VideoCapture(0)
for label, letter in enumerate(ASL_LETTERS):
    print(f"\n Collecting data for letter '{letter}'. Press 's' to start, 'q' to quit.")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        cv2.putText(frame, f"Letter: {letter}", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("ASL Data Collection", frame)
        key = cv2.waitKey(1)
        if key == ord('s'):
            data = []
            print(f" Collecting {NUM_SAMPLES} samples for {letter}...")
            count = 0
            while count < NUM_SAMPLES:
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                res = hands.process(rgb)
                if res.multi_hand_landmarks:
                    lm = res.multi_hand_landmarks[0].landmark
                    feature = extract_features(lm)
                    data.append(feature)
                    count += 1
                    cv2.putText(frame, f"{letter}: {count}/{NUM_SAMPLES}", (10, 40),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.imshow("ASL Data Collection", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            np.save(os.path.join(DATA_DIR, f"{letter}.npy"), np.array(data))
            print(f" Saved {letter}.npy")
            break
        elif key == ord('q'):
            cap.release()
            cv2.destroyAllWindows()
            exit()
cap.release()
cv2.destroyAllWindows()
