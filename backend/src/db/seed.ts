import type { GestureMapping, AppSettings } from '@signbridge/shared';

const ASL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const HCI_GESTURES: Array<{ code: string; name: string; desc: string }> = [
  { code: 'open_palm', name: 'Open Palm (Scroll Up)', desc: 'Extend all 5 fingers flat; triggers page scroll upward.' },
  { code: 'fist', name: 'Fist (Idle / Deactivate)', desc: 'Closed fist; deactivates cursor tracking and zoom mode.' },
  { code: 'two_fingers', name: 'Two Fingers (Cursor Tracking)', desc: 'Index and middle fingers upright; moves virtual cursor with index fingertip.' },
  { code: 'pointing', name: 'Pointing', desc: 'Index finger extended upright pointing.' },
  { code: 'thumbs_up', name: 'Thumbs Up (Volume Up)', desc: 'Thumb upright with fist curled; increases audio volume by 10%.' },
  { code: 'thumbs_down', name: 'Thumbs Down (Volume Down)', desc: 'Thumb pointing down with fist curled; decreases audio volume by 10%.' },
  { code: 'victory', name: 'Victory (Zoom Mode)', desc: 'V-sign with two fingers; activates zoom mode where thumb-index pinch scales view.' },
  { code: 'ok_sign', name: 'OK Sign (Right Click)', desc: 'Thumb and index form a circle; triggers secondary / right click action.' },
  { code: 'pinch', name: 'Pinch (Left Click)', desc: 'Thumb tip and index tip touch; triggers primary click selection.' },
];

export const DEFAULT_GESTURES: GestureMapping[] = [
  // --- 26 ASL Alphabet Letters (Harshil ASL Model) ---
  ...ASL_LETTERS.map((letter) => ({
    category: `ASL_${letter}`,
    text: letter,
    status: 'implemented_tested' as const,
    type: 'asl_letter' as const,
    enabled: true,
    description: `ASL manual alphabet letter ${letter}. Powered by Harshil ASL neural network model (63 landmark features).`,
    language: 'ASL',
  })),

  // --- 9 HCI Gestures (Harshil Gesture Model) ---
  ...HCI_GESTURES.map((g) => ({
    category: `HCI_${g.code.toUpperCase()}`,
    text: g.name,
    status: 'implemented_tested' as const,
    type: 'generic_gesture' as const,
    enabled: true,
    description: g.desc,
    language: 'HCI',
  })),
];

export const DEFAULT_SETTINGS: AppSettings = {
  speechEnabled: true,
  speechRate: 1.0,
  confidenceThreshold: 0.65,
  autoSpeak: false,
  recognitionMode: 'harshil_asl',
  aiAssistanceEnabled: true,
  holdTimeMs: 350,
};
