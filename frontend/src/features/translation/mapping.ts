import type { GestureMapping } from '@signbridge/shared';

export const FALLBACK_GESTURE_MAP: Record<string, string> = {
  Open_Palm: 'Hello / Greeting',
  Closed_Fist: 'Yes / Confirmed',
  Thumb_Up: 'Good / Agree',
  Thumb_Down: 'Disagree / No',
  Pointing_Up: 'One / Look here',
  Victory: 'Peace / Two',
  ILoveYou: 'I Love You',
};

export function mapGestureToText(
  category: string | null | undefined,
  gesturesList: GestureMapping[] = []
): { text: string; isKnown: boolean; isEnabled: boolean } {
  if (!category || category === 'None') {
    return { text: '', isKnown: false, isEnabled: false };
  }

  // 1. Check loaded backend mappings
  const found = gesturesList.find(
    (g) => g.category.toLowerCase() === category.toLowerCase()
  );

  if (found) {
    return {
      text: found.text,
      isKnown: true,
      isEnabled: found.enabled,
    };
  }

  // 2. Check local fallback map
  if (category in FALLBACK_GESTURE_MAP) {
    return {
      text: FALLBACK_GESTURE_MAP[category],
      isKnown: true,
      isEnabled: true,
    };
  }

  // 3. Fallback for unexpected or custom categories
  const formatted = category.replace(/_/g, ' ');
  return {
    text: formatted,
    isKnown: false,
    isEnabled: true,
  };
}
