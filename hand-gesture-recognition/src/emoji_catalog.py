"""
emoji_catalog.py - 100 gesture-to-emoji mapping catalogue.

Important:
- This is a design catalogue, not a trained model.
- Several entries share similar poses/emoji outputs. A static classifier cannot
  distinguish visually identical classes; merge such classes or use temporal/
  context-aware recognition.
- This is not a universal sign-language dictionary.
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
from typing import Dict, List, Optional


GESTURE_CLASSES: Dict[str, dict] = {
    "THUMBS_UP": {
        "emoji": "👍",
        "name": "Thumbs Up",
        "gesture": "Make a fist and extend the thumb upward.",
        "hands": 1,
        "type": "static",
    },
    "THUMBS_DOWN": {
        "emoji": "👎",
        "name": "Thumbs Down",
        "gesture": "Make a fist and extend the thumb downward.",
        "hands": 1,
        "type": "static",
    },
    "PEACE": {
        "emoji": "✌️",
        "name": "Peace / Victory",
        "gesture": "Extend index and middle fingers in a V.",
        "hands": 1,
        "type": "static",
    },
    "OK_SIGN": {
        "emoji": "👌",
        "name": "OK",
        "gesture": "Touch thumb and index fingertips to form a circle.",
        "hands": 1,
        "type": "static",
    },
    "ROCK_ON": {
        "emoji": "🤘",
        "name": "Rock On",
        "gesture": "Extend index and little fingers.",
        "hands": 1,
        "type": "static",
    },
    "CALL_ME": {
        "emoji": "🤙",
        "name": "Call Me",
        "gesture": "Extend thumb and little finger.",
        "hands": 1,
        "type": "static",
    },
    "LOVE_YOU_HAND": {
        "emoji": "🤟",
        "name": "Love You hand sign",
        "gesture": "Extend thumb, index, and little finger.",
        "hands": 1,
        "type": "static",
    },
    "CROSSED_FINGERS": {
        "emoji": "🤞",
        "name": "Fingers Crossed",
        "gesture": "Cross index and middle fingers.",
        "hands": 1,
        "type": "static",
    },
    "OPEN_PALM": {
        "emoji": "✋",
        "name": "Stop / Open Palm",
        "gesture": "Face palm toward camera with all fingers extended.",
        "hands": 1,
        "type": "static",
    },
    "RAISED_HAND": {
        "emoji": "🖐️",
        "name": "Raised Hand",
        "gesture": "Spread all five fingers toward camera.",
        "hands": 1,
        "type": "static",
    },
    "FIST": {
        "emoji": "✊",
        "name": "Raised Fist",
        "gesture": "Close all fingers into a fist.",
        "hands": 1,
        "type": "static",
    },
    "POINT_UP": {
        "emoji": "☝️",
        "name": "Index Up",
        "gesture": "Extend index finger upward.",
        "hands": 1,
        "type": "static",
    },
    "POINT_LEFT": {
        "emoji": "👈",
        "name": "Point Left",
        "gesture": "Point index finger left in the image.",
        "hands": 1,
        "type": "static",
    },
    "POINT_RIGHT": {
        "emoji": "👉",
        "name": "Point Right",
        "gesture": "Point index finger right in the image.",
        "hands": 1,
        "type": "static",
    },
    "POINT_FORWARD": {
        "emoji": "🫵",
        "name": "Point at Viewer",
        "gesture": "Point index finger toward the camera.",
        "hands": 1,
        "type": "static",
    },
    "POINT_UPWARD": {
        "emoji": "👆",
        "name": "Point Upward",
        "gesture": "Point index finger toward the top of the image.",
        "hands": 1,
        "type": "static",
    },
    "POINT_DOWN": {
        "emoji": "👇",
        "name": "Point Down",
        "gesture": "Point index finger toward the bottom of the image.",
        "hands": 1,
        "type": "static",
    },
    "PINCH": {
        "emoji": "🤏",
        "name": "Pinch / A Little",
        "gesture": "Bring thumb and index fingertip close together.",
        "hands": 1,
        "type": "static",
    },
    "PINCHED_FINGERS": {
        "emoji": "🤌",
        "name": "Pinched Fingers",
        "gesture": "Bring fingertips together near the thumb.",
        "hands": 1,
        "type": "static",
    },
    "FINGER_HEART": {
        "emoji": "🫰",
        "name": "Finger Heart",
        "gesture": "Make the familiar thumb-and-index finger-heart pose.",
        "hands": 1,
        "type": "static",
    },
    "VULCAN_SALUTE": {
        "emoji": "🖖",
        "name": "Vulcan Salute",
        "gesture": "Separate index/middle fingers from ring/little fingers.",
        "hands": 1,
        "type": "static",
    },
    "WAVE": {
        "emoji": "👋",
        "name": "Wave",
        "gesture": "Wave an open hand side to side.",
        "hands": 1,
        "type": "dynamic",
    },
    "FOLDED_HANDS": {
        "emoji": "🙏",
        "name": "Folded Hands / Thanks",
        "gesture": "Bring both palms together.",
        "hands": 2,
        "type": "static",
    },
    "HEART_HANDS": {
        "emoji": "🫶",
        "name": "Heart Hands",
        "gesture": "Use both hands to form a heart shape.",
        "hands": 2,
        "type": "static",
    },
    "CLAP": {
        "emoji": "👏",
        "name": "Clapping",
        "gesture": "Bring both palms together repeatedly.",
        "hands": 2,
        "type": "dynamic",
    },
    "PALMS_UP": {
        "emoji": "🤲",
        "name": "Palms Up",
        "gesture": "Hold both palms facing upward.",
        "hands": 2,
        "type": "static",
    },
    "OPEN_HANDS": {
        "emoji": "👐",
        "name": "Open Hands",
        "gesture": "Show both open palms.",
        "hands": 2,
        "type": "static",
    },
    "CROSSED_ARMS_NO": {
        "emoji": "🙅",
        "name": "No / Not Allowed",
        "gesture": "Cross forearms in front of the body.",
        "hands": 2,
        "type": "dynamic",
    },
    "OK_ARMS": {
        "emoji": "🙆",
        "name": "OK / All Good",
        "gesture": "Form a circle with arms above or around head.",
        "hands": 2,
        "type": "static",
    },
    "SHRUG": {
        "emoji": "🤷",
        "name": "Shrug / Don't Know",
        "gesture": "Raise shoulders and turn palms upward.",
        "hands": 2,
        "type": "dynamic",
    },
    "FACEPALM": {
        "emoji": "🤦",
        "name": "Facepalm",
        "gesture": "Bring one hand to forehead.",
        "hands": 1,
        "type": "static",
    },
    "THINKING": {
        "emoji": "🤔",
        "name": "Thinking",
        "gesture": "Rest hand near chin in a thinking pose.",
        "hands": 1,
        "type": "static",
    },
    "SHUSH": {
        "emoji": "🤫",
        "name": "Be Quiet",
        "gesture": "Place index finger vertically near lips.",
        "hands": 1,
        "type": "static",
    },
    "SALUTE": {
        "emoji": "🫡",
        "name": "Salute",
        "gesture": "Raise hand to forehead in a salute pose.",
        "hands": 1,
        "type": "dynamic",
    },
    "FLEX": {
        "emoji": "💪",
        "name": "Strong / Flex",
        "gesture": "Flex arm to show biceps.",
        "hands": 1,
        "type": "static",
    },
    "NAIL_POLISH": {
        "emoji": "💅",
        "name": "Nail Polish",
        "gesture": "Raise hand and tilt fingers as if inspecting nails.",
        "hands": 1,
        "type": "static",
    },
    "SELFIE": {
        "emoji": "🤳",
        "name": "Selfie",
        "gesture": "Hold hand as if holding a phone for a selfie.",
        "hands": 1,
        "type": "static",
    },
    "RAISED_HAND_BACK": {
        "emoji": "🤚",
        "name": "Back of Hand Raised",
        "gesture": "Raise hand with back facing camera.",
        "hands": 1,
        "type": "static",
    },
    "VULCAN_ALT": {
        "emoji": "🖖",
        "name": "Vulcan Salute Alt",
        "gesture": "Hold the Vulcan-style finger separation.",
        "hands": 1,
        "type": "static",
    },
    "THREE_FINGERS": {
        "emoji": "🤟",
        "name": "Three Fingers / Love You",
        "gesture": "Extend thumb, index and little finger.",
        "hands": 1,
        "type": "static",
    },
    "TWO_FINGERS": {
        "emoji": "✌️",
        "name": "Two Fingers",
        "gesture": "Extend index and middle fingers.",
        "hands": 1,
        "type": "static",
    },
    "ONE_FINGER": {
        "emoji": "☝️",
        "name": "One",
        "gesture": "Raise one index finger.",
        "hands": 1,
        "type": "static",
    },
    "FIVE_FINGERS": {
        "emoji": "🖐️",
        "name": "Five",
        "gesture": "Extend all five fingers.",
        "hands": 1,
        "type": "static",
    },
    "ZERO_OK": {
        "emoji": "👌",
        "name": "Zero / OK",
        "gesture": "Make a circle using thumb and index finger.",
        "hands": 1,
        "type": "static",
    },
    "HAND_OVER_HEART": {
        "emoji": "❤️",
        "name": "Hand Over Heart",
        "gesture": "Place a hand over the chest to represent heart/love.",
        "hands": 1,
        "type": "static",
    },
    "MINI_HEART": {
        "emoji": "🫰",
        "name": "Mini Heart",
        "gesture": "Make a small finger-heart gesture.",
        "hands": 1,
        "type": "static",
    },
    "WELCOME_ARMS": {
        "emoji": "👐",
        "name": "Welcome",
        "gesture": "Open both arms/hands in a welcoming pose.",
        "hands": 2,
        "type": "static",
    },
    "GIVE": {
        "emoji": "🤲",
        "name": "Give / Offer",
        "gesture": "Hold cupped palms forward and upward.",
        "hands": 2,
        "type": "static",
    },
    "PRAY": {
        "emoji": "🙏",
        "name": "Pray",
        "gesture": "Press palms together in front of chest.",
        "hands": 2,
        "type": "static",
    },
    "CHEER": {
        "emoji": "🙌",
        "name": "Celebrate / Hands Up",
        "gesture": "Raise both hands above head.",
        "hands": 2,
        "type": "static",
    },
    "SURRENDER": {
        "emoji": "🙌",
        "name": "Hands Up / Surrender",
        "gesture": "Raise both open hands overhead.",
        "hands": 2,
        "type": "static",
    },
    "STOP_BOTH": {
        "emoji": "✋",
        "name": "Stop",
        "gesture": "Raise open palm toward camera.",
        "hands": 1,
        "type": "static",
    },
    "WAIT": {
        "emoji": "✋",
        "name": "Wait",
        "gesture": "Hold an open palm forward.",
        "hands": 1,
        "type": "static",
    },
    "COME_HERE": {
        "emoji": "👋",
        "name": "Come Here",
        "gesture": "Curl fingers inward in a beckoning motion.",
        "hands": 1,
        "type": "dynamic",
    },
    "GO_AWAY": {
        "emoji": "👋",
        "name": "Go Away",
        "gesture": "Move an open hand outward.",
        "hands": 1,
        "type": "dynamic",
    },
    "POINT_SELF": {
        "emoji": "🫵",
        "name": "You / Point at Viewer",
        "gesture": "Point index finger toward viewer.",
        "hands": 1,
        "type": "static",
    },
    "POINT_OTHER": {
        "emoji": "👉",
        "name": "Point There",
        "gesture": "Point index finger to the side.",
        "hands": 1,
        "type": "static",
    },
    "LEFT_HAND_POINT": {
        "emoji": "👈",
        "name": "Left Direction",
        "gesture": "Point left.",
        "hands": 1,
        "type": "static",
    },
    "RIGHT_HAND_POINT": {
        "emoji": "👉",
        "name": "Right Direction",
        "gesture": "Point right.",
        "hands": 1,
        "type": "static",
    },
    "UP_DIRECTION": {
        "emoji": "👆",
        "name": "Up Direction",
        "gesture": "Point up.",
        "hands": 1,
        "type": "static",
    },
    "DOWN_DIRECTION": {
        "emoji": "👇",
        "name": "Down Direction",
        "gesture": "Point down.",
        "hands": 1,
        "type": "static",
    },
    "TINY": {
        "emoji": "🤏",
        "name": "Tiny / Small",
        "gesture": "Show a small gap between thumb and index finger.",
        "hands": 1,
        "type": "static",
    },
    "PINCH_PICKUP": {
        "emoji": "🤏",
        "name": "Pick Up Small Object",
        "gesture": "Pinch thumb and index as if picking up something tiny.",
        "hands": 1,
        "type": "static",
    },
    "SNAP_PREP": {
        "emoji": "🤌",
        "name": "Snap / Fingers Together",
        "gesture": "Position thumb and middle finger for a snap.",
        "hands": 1,
        "type": "static",
    },
    "FINGER_SNAP": {
        "emoji": "👏",
        "name": "Snap / Clap Action",
        "gesture": "Perform a finger snap or clap-like action.",
        "hands": 1,
        "type": "dynamic",
    },
    "CROSS_FINGERS_LUCK": {
        "emoji": "🤞",
        "name": "Good Luck",
        "gesture": "Cross index and middle fingers.",
        "hands": 1,
        "type": "static",
    },
    "ROCK_HAND": {
        "emoji": "🤘",
        "name": "Rock Gesture",
        "gesture": "Extend index and little finger.",
        "hands": 1,
        "type": "static",
    },
    "PHONE_HAND": {
        "emoji": "🤙",
        "name": "Phone / Call",
        "gesture": "Hold thumb and little finger outward like a phone.",
        "hands": 1,
        "type": "static",
    },
    "LOVE_SIGN": {
        "emoji": "🤟",
        "name": "Love You",
        "gesture": "Use the thumb-index-little-finger hand sign.",
        "hands": 1,
        "type": "static",
    },
    "V_SIGN": {
        "emoji": "✌️",
        "name": "Victory",
        "gesture": "Make a V sign.",
        "hands": 1,
        "type": "static",
    },
    "A_OK": {
        "emoji": "👌",
        "name": "All Okay",
        "gesture": "Make the OK circle.",
        "hands": 1,
        "type": "static",
    },
    "FIST_BUMP_PREP": {
        "emoji": "👊",
        "name": "Fist Bump",
        "gesture": "Hold fist forward toward camera.",
        "hands": 1,
        "type": "static",
    },
    "FIST_BUMP": {
        "emoji": "👊",
        "name": "Fist Bump Action",
        "gesture": "Move fist forward toward another fist.",
        "hands": 2,
        "type": "dynamic",
    },
    "HANDSHAKE": {
        "emoji": "🤝",
        "name": "Handshake",
        "gesture": "Two people clasp hands; use a two-hand/partner setup.",
        "hands": 2,
        "type": "dynamic",
    },
    "WAVE_BOTH": {
        "emoji": "👋",
        "name": "Wave Both Hands",
        "gesture": "Wave both open hands.",
        "hands": 2,
        "type": "dynamic",
    },
    "HEART_SHAPE": {
        "emoji": "🫶",
        "name": "Heart Shape",
        "gesture": "Form heart with both hands.",
        "hands": 2,
        "type": "static",
    },
    "HUG": {
        "emoji": "🤗",
        "name": "Hug / Open Arms",
        "gesture": "Open arms as if inviting a hug.",
        "hands": 2,
        "type": "static",
    },
    "MUSCLE": {
        "emoji": "💪",
        "name": "Muscle",
        "gesture": "Flex arm.",
        "hands": 1,
        "type": "static",
    },
    "FINGER_GUN_LEFT": {
        "emoji": "👉",
        "name": "Finger Gun Left/Right",
        "gesture": "Extend index and thumb in a finger-gun-like point.",
        "hands": 1,
        "type": "static",
    },
    "FINGER_GUN_RIGHT": {
        "emoji": "👈",
        "name": "Finger Point",
        "gesture": "Point index finger laterally.",
        "hands": 1,
        "type": "static",
    },
    "PEACE_NEAR_FACE": {
        "emoji": "✌️",
        "name": "Peace Near Face",
        "gesture": "Hold V sign near face.",
        "hands": 1,
        "type": "static",
    },
    "PEACE_TWO_HANDS": {
        "emoji": "✌️",
        "name": "Double Peace",
        "gesture": "Show V signs with both hands.",
        "hands": 2,
        "type": "static",
    },
    "WISH": {
        "emoji": "🤞",
        "name": "Wish / Fingers Crossed",
        "gesture": "Cross fingers.",
        "hands": 1,
        "type": "static",
    },
    "QUIET": {
        "emoji": "🤫",
        "name": "Quiet",
        "gesture": "Index finger to lips.",
        "hands": 1,
        "type": "static",
    },
    "QUESTION": {
        "emoji": "🤔",
        "name": "Question / Thinking",
        "gesture": "Touch chin with hand.",
        "hands": 1,
        "type": "static",
    },
    "NOPE": {
        "emoji": "🙅",
        "name": "No",
        "gesture": "Cross arms to indicate no.",
        "hands": 2,
        "type": "dynamic",
    },
    "YES_CHEER": {
        "emoji": "🙌",
        "name": "Yes / Celebrate",
        "gesture": "Raise both hands in celebration.",
        "hands": 2,
        "type": "dynamic",
    },
    "THANKS": {
        "emoji": "🙏",
        "name": "Thank You / Thanks",
        "gesture": "Press palms together; note this is a common gesture, not universal sign-language translation.",
        "hands": 2,
        "type": "static",
    },
    "PLEASE": {
        "emoji": "🙏",
        "name": "Please",
        "gesture": "Hands together as a courtesy gesture; sign language varies.",
        "hands": 2,
        "type": "static",
    },
    "SORRY": {
        "emoji": "🫶",
        "name": "Sorry (custom association)",
        "gesture": "No universal emoji-specific gesture; this is a custom mapping only.",
        "hands": 2,
        "type": "static",
    },
    "HELLO": {
        "emoji": "👋",
        "name": "Hello",
        "gesture": "Wave hand.",
        "hands": 1,
        "type": "dynamic",
    },
    "GOODBYE": {
        "emoji": "👋",
        "name": "Goodbye",
        "gesture": "Wave hand.",
        "hands": 1,
        "type": "dynamic",
    },
    "HAPPY": {
        "emoji": "🙌",
        "name": "Happy / Celebrate",
        "gesture": "Raise hands in celebration.",
        "hands": 2,
        "type": "dynamic",
    },
    "SAD": {
        "emoji": "😔",
        "name": "Sad",
        "gesture": "Lower head and bring hand near face; visually ambiguous.",
        "hands": 1,
        "type": "dynamic",
    },
    "I_LOVE_YOU": {
        "emoji": "🤟",
        "name": "I Love You Hand Sign",
        "gesture": "Extend thumb, index and little finger.",
        "hands": 1,
        "type": "static",
    },
    "GOOD_LUCK": {
        "emoji": "🤞",
        "name": "Good Luck",
        "gesture": "Cross index and middle fingers.",
        "hands": 1,
        "type": "static",
    },
    "APPLAUSE": {
        "emoji": "👏",
        "name": "Applause",
        "gesture": "Clap hands.",
        "hands": 2,
        "type": "dynamic",
    },
    "WELCOME": {
        "emoji": "👐",
        "name": "Welcome",
        "gesture": "Open both arms/hands.",
        "hands": 2,
        "type": "static",
    },
    "CALL_ME_AGAIN": {
        "emoji": "🤙",
        "name": "Call Me",
        "gesture": "Extend thumb and little finger.",
        "hands": 1,
        "type": "static",
    },
    "LOOK_HERE": {
        "emoji": "🫵",
        "name": "Look Here",
        "gesture": "Point index finger toward viewer.",
        "hands": 1,
        "type": "static",
    },
}


@dataclass(frozen=True)
class EmojiGestureDef:
    class_id: str
    emoji: str
    name: str
    gesture: str
    hands: int          # 1 or 2
    type: str           # 'static' or 'dynamic'
    description: str = ""
    collection_procedure: str = ""


# Canonical object list built from the 100 GESTURE_CLASSES
EMOJI_CLASSES: List[EmojiGestureDef] = [
    EmojiGestureDef(
        class_id=k,
        emoji=v["emoji"],
        name=v["name"],
        gesture=v["gesture"],
        hands=v["hands"],
        type=v["type"],
        description=v["gesture"],
        collection_procedure=f"{v['gesture']} [{'1 Hand' if v['hands'] == 1 else '2 Hands'}, {v['type']}]."
    )
    for k, v in GESTURE_CLASSES.items()
]

CLASS_MAP: Dict[str, EmojiGestureDef] = {item.class_id: item for item in EMOJI_CLASSES}
CLASS_NAMES: List[str] = list(GESTURE_CLASSES.keys())


def get_class_by_id(key: str) -> Optional[EmojiGestureDef]:
    """Retrieves gesture definition by exact key or alias with fallback matching."""
    if not key:
        return None
    if key in CLASS_MAP:
        return CLASS_MAP[key]

    clean = key.strip().upper()
    if clean in CLASS_MAP:
        return CLASS_MAP[clean]

    # Handle legacy prefix like EMOJI_01_THUMBS_UP
    if clean.startswith("EMOJI_"):
        parts = clean.split("_", 2)
        if len(parts) >= 3:
            sub = parts[2]
            if sub in CLASS_MAP:
                return CLASS_MAP[sub]

    # Substring search
    for k, v in CLASS_MAP.items():
        if k in clean or clean in k:
            return v

    return None


def get_catalog_dict() -> List[dict]:
    return [
        {
            "class_id": item.class_id,
            "emoji": item.emoji,
            "name": item.name,
            "gesture": item.gesture,
            "hands": item.hands,
            "type": item.type,
            "description": item.description,
            "collection_procedure": item.collection_procedure,
        }
        for item in EMOJI_CLASSES
    ]


def export_catalog_json(output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(get_catalog_dict(), f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    print(f"Defined gesture classes: {len(GESTURE_CLASSES)}")
    for key, value in GESTURE_CLASSES.items():
        print(f'{value["emoji"]}  {key}: {value["name"]} — {value["gesture"]}')
