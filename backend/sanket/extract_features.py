import cv2
import numpy as np
import mediapipe as mp
import torch
import torchvision.transforms as T
from PIL import Image

# Initialize MediaPipe Holistic (Face, Hands, Pose)
mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Standard TimeSformer / ResNet transforms (MATCHING TRAINING DATASET.PY)
transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor() # Converts (H, W, C) [0, 255] to (C, H, W) [0.0, 1.0] exactly matching train.py
])

def extract_keypoints(results):
    """
    Extracts and flattens MediaPipe keypoints precisely mirroring the `195`-dimensional 
    training structure found in `extract_mediapipe.py`.
    Hands: 21 * 3 = 63
    Upper Pose: 23 * 3 = 69
    Total: 195 dimensions.
    """
    # Hands (21 * 3 = 63 points each)
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    
    # Pose (Taking only top 23 landmarks - upper body/arms/face baseline, 3 coords each)
    pose = np.array([[res.x, res.y, res.z] for res in results.pose_landmarks.landmark][:23]).flatten() if results.pose_landmarks else np.zeros(23*3)
    
    return np.concatenate([pose, lh, rh])

def process_continuous_video(video_path, frames_per_chunk=8):
    """
    Takes a recorded live video and implements Dynamic Chunk Boundary Detection.
    It tracks wrist drop (y-coordinate > 0.75) to naturally segment continuous 
    signing into isolated words. It then uniformly samples 8 frames per segmented chunk.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"OpenCV could not physically open {video_path}")

    all_frames = []
    all_poses = []
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        # 1. Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # 2. Extract MediaPipe Skeleton
        results = holistic.process(frame_rgb)
        keypoints = extract_keypoints(results)
        
        all_frames.append(frame_rgb)
        all_poses.append(keypoints)
        
    cap.release()
    
    total_frames = len(all_frames)
    if total_frames == 0:
        return []

    # --- DYNAMIC BOUNDARY ALGORITHM ---
    # Track the Y-coordinate of the Left (landmark 15) and Right (landmark 16) wrists.
    # In MediaPipe, y=0.0 is the top of the frame, y=1.0 is the bottom (waist).
    # If wrists drop below y=0.75, the signer is in a resting state (sign finished).
    
    boundaries = []
    in_sign = False
    start_idx = 0
    
    for i in range(total_frames):
        kp = all_poses[i]
        
        # Extract Y coordinates (index 1 = Y axis for each 3D point)
        # poses[15*3:15*3+3] represents [X, Y, Z] of Left Wrist
        lw_y = kp[15 * 3 + 1] if np.sum(kp[15 * 3 : 15 * 3 + 3]) != 0 else 0
        rw_y = kp[16 * 3 + 1] if np.sum(kp[16 * 3 : 16 * 3 + 3]) != 0 else 0
        
        # Define "Hands Down" as both wrists dropping below the chest, or not visible
        hands_down = (lw_y > 0.75 or lw_y == 0) and (rw_y > 0.75 or rw_y == 0)
        
        if not hands_down and not in_sign:
            in_sign = True
            start_idx = i
        elif hands_down and in_sign:
            in_sign = False
            chunk_len = i - start_idx
            if chunk_len >= 5: # Filter out micro-jitter (must be at least a 5 frame sign)
                boundaries.append((start_idx, i))
                
    # If the video ends while they are still signing, close the chunk automatically
    if in_sign and (total_frames - start_idx >= 5):
        boundaries.append((start_idx, total_frames))
        
    # Safety fallback: If they never dropped their hands, treat the whole video as 1 sign
    if not boundaries:
        boundaries.append((0, total_frames))

    # --- SEGMENT EXTRACTION ---
    chunked_tensors = []
    
    for start_f, end_f in boundaries:
        chunk_len = end_f - start_f
        
        # Mathematically mirror `_sample_indices` exactly from `dataset.py`
        if chunk_len <= frames_per_chunk:
            frame_indices = np.arange(start_f, end_f).tolist()
            frame_indices += [end_f - 1] * (frames_per_chunk - chunk_len)
        else:
            frame_indices = np.linspace(start_f, end_f - 1, frames_per_chunk, dtype=int).tolist()
            
        frames = []
        poses = []
        
        for idx in frame_indices:
            rgb_img = all_frames[idx]
            kp = all_poses[idx]
            
            # Process Video Pixel Tensors
            pil_img = Image.fromarray(rgb_img)
            tensor_img = transform(pil_img)
            
            frames.append(tensor_img)
            poses.append(kp)

        # Padding if the chunk had literally 0 valid frames
        while len(frames) < frames_per_chunk:
            frames.append(torch.zeros((3, 224, 224)))
            poses.append(np.zeros(195))

        # Stack into final unified batches
        video_tensor = torch.stack(frames).unsqueeze(0)  # [1, 8, 3, 224, 224]
        pose_tensor = torch.tensor(np.array(poses), dtype=torch.float32).unsqueeze(0)  # [1, 8, 195]
        
        chunked_tensors.append((video_tensor, pose_tensor))
        
    return chunked_tensors
