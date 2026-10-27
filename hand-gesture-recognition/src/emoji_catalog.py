"""
emoji_catalog.py - Canonical Catalog of 30 Distinct Hand Gesture Emojis.

Each gesture is formally defined with:
- class_id: Unique string identifier for folder naming and model indexing
- emoji: Unicode character
- name: Human-readable display title
- description: Precise anatomical and hand configuration description
- hands: '1_hand' or '2_hands'
- type: 'static' or 'dynamic'
- collection_procedure: Instructions for accurate webcam recording
"""
from __future__ import annotations

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional


@dataclass(frozen=True)
class EmojiGestureDef:
    class_id: str
    emoji: str
    name: str
    description: str
    hands: str          # '1_hand' | '2_hands'
    type: str           # 'static' | 'dynamic'
    collection_procedure: str


# 30 Distinct, Non-ambiguous Emoji Gesture Classes
EMOJI_CLASSES: List[EmojiGestureDef] = [
    EmojiGestureDef(
        class_id="EMOJI_01_THUMBS_UP",
        emoji="👍",
        name="Thumbs Up",
        description="Fist closed with thumb extended upright vertically.",
        hands="1_hand",
        type="static",
        collection_procedure="Hold fist facing camera at chest level, thumb pointing straight up. Keep wrist stable."
    ),
    EmojiGestureDef(
        class_id="EMOJI_02_THUMBS_DOWN",
        emoji="👎",
        name="Thumbs Down",
        description="Fist closed with thumb pointing straight down.",
        hands="1_hand",
        type="static",
        collection_procedure="Invert fist so the thumb points downward toward the ground. Palm facing inwards/sideways."
    ),
    EmojiGestureDef(
        class_id="EMOJI_03_OK_HAND",
        emoji="👌",
        name="OK Sign",
        description="Thumb and index fingertip touching in a circle; middle, ring, and pinky extended upward.",
        hands="1_hand",
        type="static",
        collection_procedure="Face palm forward or slightly tilted, forming an open circular loop between thumb and index."
    ),
    EmojiGestureDef(
        class_id="EMOJI_04_PEACE",
        emoji="✌️",
        name="Peace / Victory",
        description="Index and middle fingers extended apart in a V-shape; thumb folds over ring and pinky.",
        hands="1_hand",
        type="static",
        collection_procedure="Hold V-shape upright with palm facing camera. Keep index and middle fingers straight."
    ),
    EmojiGestureDef(
        class_id="EMOJI_05_LOVE_YOU",
        emoji="🤟",
        name="Love You (ILY)",
        description="Thumb, index, and pinky extended; middle and ring fingers folded into palm.",
        hands="1_hand",
        type="static",
        collection_procedure="ASL 'I Love You' sign. Spread thumb, index, and pinky outwards, palm facing camera."
    ),
    EmojiGestureDef(
        class_id="EMOJI_06_ROCK_ON",
        emoji="🤘",
        name="Rock On (Horns)",
        description="Index and pinky fingers extended; thumb holds down folded middle and ring fingers.",
        hands="1_hand",
        type="static",
        collection_procedure="Classic horns sign. Keep thumb clamped over middle two fingers so it does not splay outward."
    ),
    EmojiGestureDef(
        class_id="EMOJI_07_STOP",
        emoji="✋",
        name="Raised Hand / Stop",
        description="Flat open palm facing forward with all five fingers held together upright.",
        hands="1_hand",
        type="static",
        collection_procedure="Present open palm flat toward the camera, fingers aligned together vertically."
    ),
    EmojiGestureDef(
        class_id="EMOJI_08_FIST",
        emoji="✊",
        name="Raised Fist",
        description="Solid clenched fist held upright with fingers curled tightly into palm, thumb over fingers.",
        hands="1_hand",
        type="static",
        collection_procedure="Clench fist firmly with knuckles facing camera or slightly angled."
    ),
    EmojiGestureDef(
        class_id="EMOJI_09_WAVE",
        emoji="👋",
        name="Waving Hand",
        description="Open hand oscillating side-to-side horizontally at wrist.",
        hands="1_hand",
        type="dynamic",
        collection_procedure="Wave hand left-to-right at a natural conversational speed in front of camera."
    ),
    EmojiGestureDef(
        class_id="EMOJI_10_HEART_HANDS",
        emoji="🫶",
        name="Heart Hands",
        description="Both hands curved together with thumbs pointing down and fingers meeting to form a heart.",
        hands="2_hands",
        type="static",
        collection_procedure="Bring both hands together at chest level, joining index fingers at top and thumbs at bottom."
    ),
    EmojiGestureDef(
        class_id="EMOJI_11_PRAYING",
        emoji="🙏",
        name="Folded Hands / Please",
        description="Both flat palms pressed firmly together in prayer/namaste position, fingers pointing up.",
        hands="2_hands",
        type="static",
        collection_procedure="Place palms flush together vertically in front of chest, fingers upright and touching."
    ),
    EmojiGestureDef(
        class_id="EMOJI_12_CALL_ME",
        emoji="🤙",
        name="Call Me / Shaka",
        description="Thumb and pinky finger fully extended; three middle fingers curled into palm.",
        hands="1_hand",
        type="static",
        collection_procedure="Hold hand near cheek or chest with thumb and pinky sticking out sideways."
    ),
    EmojiGestureDef(
        class_id="EMOJI_13_ONE_ATTENTION",
        emoji="☝️",
        name="Index Pointing Up (Palm Forward)",
        description="Single index finger pointed straight up with palm facing forward.",
        hands="1_hand",
        type="static",
        collection_procedure="Raise index finger upright with palm side facing camera. Other fingers closed."
    ),
    EmojiGestureDef(
        class_id="EMOJI_14_PALMS_UP_GIVING",
        emoji="🤲",
        name="Palms Up Together",
        description="Both open hands held side-by-side with palms facing upwards in a cupping/receiving gesture.",
        hands="2_hands",
        type="static",
        collection_procedure="Hold both open hands flat, palms facing up, side edges almost touching."
    ),
    EmojiGestureDef(
        class_id="EMOJI_15_HAND_SPLAYED",
        emoji="🖐️",
        name="Hand Splayed / Five",
        description="Palm facing forward with all five fingers spread as wide apart as possible.",
        hands="1_hand",
        type="static",
        collection_procedure="Open hand completely with maximum separation between adjacent fingers."
    ),
    EmojiGestureDef(
        class_id="EMOJI_16_PINCHING",
        emoji="🤏",
        name="Pinching Hand",
        description="Thumb and index finger held closely parallel with a small gap (indicating a tiny amount).",
        hands="1_hand",
        type="static",
        collection_procedure="Hold hand in profile/quarter view, pinching index and thumb about 1-2 cm apart."
    ),
    EmojiGestureDef(
        class_id="EMOJI_17_POINT_LEFT",
        emoji="👈",
        name="Point Left",
        description="Back of hand facing camera with index finger extended pointing horizontally to the left.",
        hands="1_hand",
        type="static",
        collection_procedure="Point index finger firmly to the left side of the screen with knuckles facing viewer."
    ),
    EmojiGestureDef(
        class_id="EMOJI_18_POINT_RIGHT",
        emoji="👉",
        name="Point Right",
        description="Back of hand facing camera with index finger extended pointing horizontally to the right.",
        hands="1_hand",
        type="static",
        collection_procedure="Point index finger firmly to the right side of the screen with knuckles facing viewer."
    ),
    EmojiGestureDef(
        class_id="EMOJI_19_POINT_UP",
        emoji="👆",
        name="Backhand Point Up",
        description="Back of hand facing camera with index finger pointing vertically upward.",
        hands="1_hand",
        type="static",
        collection_procedure="Point index finger straight up with the back of the hand (knuckles) facing camera."
    ),
    EmojiGestureDef(
        class_id="EMOJI_20_POINT_DOWN",
        emoji="👇",
        name="Backhand Point Down",
        description="Back of hand facing camera with index finger pointing vertically downward.",
        hands="1_hand",
        type="static",
        collection_procedure="Point index finger down toward table/floor with back of hand facing camera."
    ),
    EmojiGestureDef(
        class_id="EMOJI_21_CROSSED_FINGERS",
        emoji="🤞",
        name="Crossed Fingers / Luck",
        description="Middle finger crossed over the back of the extended index finger.",
        hands="1_hand",
        type="static",
        collection_procedure="Cross middle finger over index finger, thumb holding ring finger. Face palm to camera."
    ),
    EmojiGestureDef(
        class_id="EMOJI_22_SHUSHING",
        emoji="🤫",
        name="Shushing Face Hand",
        description="Single index finger held vertically in front of lips/chin.",
        hands="1_hand",
        type="static",
        collection_procedure="Place vertical index finger in front of mouth in standard 'shh' posture."
    ),
    EmojiGestureDef(
        class_id="EMOJI_23_THINKING",
        emoji="🤔",
        name="Thinking Hand",
        description="Thumb and index finger supporting the chin/jaw, middle fingers folded.",
        hands="1_hand",
        type="static",
        collection_procedure="Rest thumb and curled index finger under chin/jaw as if pondering."
    ),
    EmojiGestureDef(
        class_id="EMOJI_24_FLEXED_BICEPS",
        emoji="💪",
        name="Flexed Biceps",
        description="Arm raised and elbow bent at 90 degrees with fist clenched to display flexed bicep.",
        hands="1_hand",
        type="static",
        collection_procedure="Raise arm with elbow bent at 90 degrees, fist clenched upward in strong pose."
    ),
    EmojiGestureDef(
        class_id="EMOJI_25_FINGER_HEART",
        emoji="🫰",
        name="Finger Heart",
        description="Thumb and index finger crossed in a small V-shape forming a miniature heart.",
        hands="1_hand",
        type="static",
        collection_procedure="Korean mini-heart: snap thumb across the first knuckle of index finger, other fingers curled."
    ),
    EmojiGestureDef(
        class_id="EMOJI_26_OPEN_HANDS",
        emoji="👐",
        name="Open Hands / Welcome",
        description="Both hands held open, palms facing outward toward viewer with fingers spread.",
        hands="2_hands",
        type="static",
        collection_procedure="Raise both open hands at chest level, palms forward, fingers spread in welcoming pose."
    ),
    EmojiGestureDef(
        class_id="EMOJI_27_GESTURE_NO",
        emoji="🙅",
        name="Gesture No / X-Arms",
        description="Both forearms crossed in front of chest forming a prominent 'X'.",
        hands="2_hands",
        type="static",
        collection_procedure="Cross both wrists/forearms across chest with hands open or in fists forming an 'X'."
    ),
    EmojiGestureDef(
        class_id="EMOJI_28_GESTURE_OK",
        emoji="🙆",
        name="Gesture OK / Overhead O",
        description="Both arms raised and curved over head with fingertips nearly touching to form an 'O'.",
        hands="2_hands",
        type="static",
        collection_procedure="Curve both arms above head with hands meeting at top to make a large 'O' circle."
    ),
    EmojiGestureDef(
        class_id="EMOJI_29_CLAPPING",
        emoji="👏",
        name="Clapping Hands",
        description="Two open hands clapping together or held in applauding proximity.",
        hands="2_hands",
        type="dynamic",
        collection_procedure="Clap hands together rhythmically at chest level or hold hands in clasped applause."
    ),
    EmojiGestureDef(
        class_id="EMOJI_30_RAISED_HANDS",
        emoji="🙌",
        name="Raising Hands / Celebration",
        description="Both hands raised high in the air with palms facing forward in triumph.",
        hands="2_hands",
        type="static",
        collection_procedure="Raise both hands up above shoulders with palms facing forward in celebratory praise."
    ),
]


CLASS_MAP: Dict[str, EmojiGestureDef] = {item.class_id: item for item in EMOJI_CLASSES}
CLASS_NAMES: List[str] = [item.class_id for item in EMOJI_CLASSES]


def get_class_by_id(class_id: str) -> Optional[EmojiGestureDef]:
    return CLASS_MAP.get(class_id)


def get_catalog_dict() -> List[dict]:
    return [asdict(item) for item in EMOJI_CLASSES]


def export_catalog_json(output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(get_catalog_dict(), f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    print(f"Total Emoji Gesture Classes Defined: {len(EMOJI_CLASSES)}")
    for i, c in enumerate(EMOJI_CLASSES, 1):
        print(f"  {i:>2}. {c.emoji} {c.name:<30} [{c.hands}, {c.type}] -> {c.class_id}")
