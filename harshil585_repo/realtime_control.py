import sys
import cv2
import mediapipe as mp
import numpy as np
import pyautogui
import time
import string
from tensorflow.keras.models import load_model
from PyQt6.QtCore import QTimer, Qt
from PyQt6.QtGui import QImage, QPixmap, QFont, QColor, QLinearGradient, QBrush
from PyQt6.QtWidgets import QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QHBoxLayout, QFrame
import keyboard


HCI_MODEL_PATH = "gesture_model.h5"
ASL_MODEL_PATH = "asl_model.h5"

INT_TO_NAME = {
    0: "open_palm",
    1: "fist",
    2: "two_fingers",
    3: "pointing",
    4: "thumbs_up",
    5: "thumbs_down",
    6: "victory",
    7: "ok_sign",
    8: "pinch"
}


DEACTIVATE_GESTURE = "fist"
TRACKING_MODE_GESTURE = "two_fingers"
ZOOM_MODE_GESTURE = "victory"
LEFT_CLICK_GESTURE = "pinch"
RIGHT_CLICK_GESTURE = "ok_sign"

ACTION_COOLDOWN = 1.0
STABLE_THRESHOLD = 5
SMOOTHING = 0.5
ASL_DELAY = 2  


class HandGestureStudio(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Hand Gesture Studio – HCI + ASL")
        self.setGeometry(100, 100, 960, 600)

       
        self.hci_model = load_model(HCI_MODEL_PATH)
        self.asl_model = load_model(ASL_MODEL_PATH)

        self.hci_labels = list(INT_TO_NAME.values())
        self.asl_labels = list(string.ascii_uppercase)

        
        mp_hands = mp.solutions.hands
        self.hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6
        )
        self.mp_draw = mp.solutions.drawing_utils

        
        self.cap = None
        self.prev_pred = None
        self.stable_count = 0
        self.tracking_mode = False
        self.zoom_mode = False
        self.asl_mode = False
        self.detected_text = ""
        self.last_action_time = 0
        self.last_asl_time = 0
        self.last_seen_time = 0
        self.prev_x, self.prev_y = pyautogui.position()
        self.screen_w, self.screen_h = pyautogui.size()

        self.init_ui()

    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Gradient background
        palette = self.palette()
        gradient = QLinearGradient(0, 0, 1, 1)
        gradient.setCoordinateMode(QLinearGradient.CoordinateMode.ObjectBoundingMode)
        gradient.setColorAt(0, QColor("#240046"))
        gradient.setColorAt(1, QColor("#5A189A"))
        palette.setBrush(self.backgroundRole(), QBrush(gradient))
        self.setPalette(palette)

        # Video display
        self.video_label = QLabel("Camera feed initializing...")
        self.video_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.video_label.setStyleSheet(
            "background-color: rgba(0,0,0,0.4); border-radius:15px; color:white;"
        )
        layout.addWidget(self.video_label, stretch=1)

        # Buttons
        btn_frame = QFrame()
        btn_layout = QHBoxLayout(btn_frame)
        btn_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.start_btn = QPushButton(" Start Camera")
        self.start_btn.setStyleSheet(self.button_style("#4CC9F0", "#4361EE"))
        self.start_btn.clicked.connect(self.start_camera)

        self.stop_btn = QPushButton(" Stop")
        self.stop_btn.setStyleSheet(self.button_style("#EF233C", "#D90429"))
        self.stop_btn.clicked.connect(self.stop_camera)

        self.mode_btn = QPushButton(" Switch to ASL Mode")
        self.mode_btn.setStyleSheet(self.button_style("#3F37C9", "#7209B7"))
        self.mode_btn.clicked.connect(self.toggle_mode)

        self.delete_btn = QPushButton(" Delete Last Letter")
        self.delete_btn.setStyleSheet(self.button_style("#F72585", "#B5179E"))
        self.delete_btn.clicked.connect(self.delete_last_letter)

        # NEW SPACE BUTTON
        self.space_btn = QPushButton(" Space")
        self.space_btn.setStyleSheet(self.button_style("#4895EF", "#4361EE"))
        self.space_btn.clicked.connect(self.add_space)

        self.exit_btn = QPushButton(" Exit")
        self.exit_btn.setStyleSheet(self.button_style("#7209B7", "#560BAD"))
        self.exit_btn.clicked.connect(self.close)

        for b in [self.start_btn, self.stop_btn, self.mode_btn, self.delete_btn, self.space_btn, self.exit_btn]:
            b.setFixedWidth(180)
            btn_layout.addWidget(b)

        layout.addWidget(btn_frame)

        # Status text
        self.status_label = QLabel("Status: Idle (HCI Mode)")
        self.status_label.setFont(QFont("Segoe UI", 12))
        self.status_label.setStyleSheet("color: white; margin-top: 8px;")
        layout.addWidget(self.status_label, alignment=Qt.AlignmentFlag.AlignCenter)

        # Detected text (ASL)
        self.asl_text_label = QLabel("")
        self.asl_text_label.setFont(QFont("Consolas", 18))
        self.asl_text_label.setStyleSheet("color: #4CC9F0; margin-top: 10px;")
        layout.addWidget(self.asl_text_label, alignment=Qt.AlignmentFlag.AlignCenter)

        # Timer for camera
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_frame)

    
    def button_style(self, c1, c2):
        return f"""
        QPushButton {{
            background-color: qlineargradient(spread:pad, x1:0, y1:0, x2:1, y2:1,
                                              stop:0 {c1}, stop:1 {c2});
            border:none; color:white; border-radius:20px;
            padding:12px 24px; font-size:14px;
        }}
        QPushButton:hover {{
            background-color: qlineargradient(spread:pad, x1:0, y1:0, x2:1, y2:1,
                                              stop:0 {c2}, stop:1 {c1});
        }}"""

  
    def start_camera(self):
        self.cap = cv2.VideoCapture(0)
        self.status_label.setText("Status: Camera Started")
        self.timer.start(30)

    def stop_camera(self):
        self.timer.stop()
        if self.cap:
            self.cap.release()
        self.video_label.clear()
        self.status_label.setText("Status: Stopped")

    def toggle_mode(self):
        self.asl_mode = not self.asl_mode
        if self.asl_mode:
            self.status_label.setText("ASL Mode ENABLED – Start signing letters")
            self.mode_btn.setText(" Switch to HCI Mode")
            self.detected_text = ""
            self.asl_text_label.setText("")
        else:
            self.status_label.setText("HCI Mode ENABLED – Gesture Control Active")
            self.mode_btn.setText(" Switch to ASL Mode")

    def delete_last_letter(self):
        if self.detected_text:
            self.detected_text = self.detected_text[:-1]
            self.asl_text_label.setText(f"Word: {self.detected_text}")

    # NEW: SPACE BUTTON FUNCTION
    def add_space(self):
        self.detected_text += " "
        self.asl_text_label.setText(f"Word: {self.detected_text}")

   
    def landmarks_to_feature(self, landmarks):
        lm = np.array([[l.x, l.y, l.z] for l in landmarks])
        wrist = lm[0].copy()
        lm -= wrist
        max_val = np.max(np.abs(lm))
        if max_val > 0:
            lm /= max_val
        return lm.flatten()

   
      

    def perform_action(self, gesture_name):
        if time.time() - self.last_action_time < ACTION_COOLDOWN:
            return

        if gesture_name == "thumbs_up":
            keyboard.send("volume up")
            self.status_label.setText("Volume Up")

        elif gesture_name == "thumbs_down":
            keyboard.send("volume down")
            self.status_label.setText("Volume Down")

        elif gesture_name == "open_palm":
            pyautogui.scroll(100)
            self.status_label.setText("Scroll Up")

        self.last_action_time = time.time()

    
    def update_frame(self):
        ret, frame = self.cap.read()
        if not ret:
            return

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.hands.process(rgb)

        pred_label = "None"
        conf = 0.0

        if result.multi_hand_landmarks:
            hand = result.multi_hand_landmarks[0]
            self.mp_draw.draw_landmarks(frame, hand, mp.solutions.hands.HAND_CONNECTIONS)
            feat = self.landmarks_to_feature(hand.landmark).reshape(1, -1)

            
            if self.asl_mode:
                preds = self.asl_model.predict(feat, verbose=0)
                idx = np.argmax(preds)
                pred_label = self.asl_labels[idx]
                conf = float(preds[0, idx])
                cv2.putText(frame, f"ASL: {pred_label} ({conf:.2f})", (10, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

                if conf > 0.8 and (time.time() - self.last_asl_time > ASL_DELAY):
                    if self.prev_pred == idx:
                        self.stable_count += 1
                    else:
                        self.stable_count = 1
                        self.prev_pred = idx

                    if self.stable_count >= STABLE_THRESHOLD:
                        self.detected_text += pred_label
                        self.asl_text_label.setText(f"Word: {self.detected_text}")
                        self.last_asl_time = time.time()
                        self.stable_count = 0

            
            else:
                preds = self.hci_model.predict(feat, verbose=0)
                idx = np.argmax(preds)
                pred_label = self.hci_labels[idx]
                conf = float(preds[0, idx])

                if self.prev_pred == idx:
                    self.stable_count += 1
                else:
                    self.stable_count = 1
                    self.prev_pred = idx

                if self.stable_count >= STABLE_THRESHOLD and conf > 0.7:
                    if pred_label == ZOOM_MODE_GESTURE:
                        self.zoom_mode = True
                        self.tracking_mode = False
                        self.status_label.setText(" Zoom Mode ENABLED")
                    elif pred_label == TRACKING_MODE_GESTURE:
                        self.tracking_mode = True
                        self.zoom_mode = False
                        self.status_label.setText(" Tracking Mode ENABLED")
                    elif pred_label == DEACTIVATE_GESTURE:
                        self.tracking_mode = False
                        self.zoom_mode = False
                        self.status_label.setText(" Idle / Tracking DISABLED")
                    else:
                        if not self.zoom_mode and not self.tracking_mode:
                            self.perform_action(pred_label)
                    self.stable_count = 0

                
                if self.tracking_mode and conf > 0.55:
                    index_tip = hand.landmark[8]
                    x, y = index_tip.x, index_tip.y
                    target_x = self.screen_w * x
                    target_y = self.screen_h * y
                    self.prev_x += (target_x - self.prev_x) * SMOOTHING
                    self.prev_y += (target_y - self.prev_y) * SMOOTHING
                    pyautogui.moveTo(self.prev_x, self.prev_y, duration=0)

                    if pred_label == LEFT_CLICK_GESTURE and conf > 0.8:
                        pyautogui.click()
                        self.status_label.setText(" Left Click")
                        time.sleep(0.3)
                    elif pred_label == RIGHT_CLICK_GESTURE and conf > 0.8:
                        pyautogui.rightClick()
                        self.status_label.setText(" Right Click")
                        time.sleep(0.3)

                elif self.zoom_mode:
                    thumb_tip = hand.landmark[4]
                    index_tip = hand.landmark[8]
                    pinch_dist = np.linalg.norm(np.array([thumb_tip.x, thumb_tip.y]) -
                                                np.array([index_tip.x, index_tip.y]))
                    if not hasattr(self, "prev_pinch_dist"):
                        self.prev_pinch_dist = pinch_dist
                    delta_pinch = pinch_dist - self.prev_pinch_dist
                    if abs(delta_pinch) > 0.015:
                        if delta_pinch < 0:
                            pyautogui.hotkey('ctrl', '+')
                            self.status_label.setText(" Zoom In")
                        else:
                            pyautogui.hotkey('ctrl', '-')
                            self.status_label.setText(" Zoom Out")
                        self.prev_pinch_dist = pinch_dist

        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = img.shape
        qimg = QImage(img.data, w, h, ch * w, QImage.Format.Format_RGB888)
        self.video_label.setPixmap(QPixmap.fromImage(qimg))

    def closeEvent(self, event):
        self.stop_camera()
        event.accept()



if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = HandGestureStudio()
    window.show()
    sys.exit(app.exec())
