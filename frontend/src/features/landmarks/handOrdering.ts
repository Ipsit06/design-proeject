import type { Point3D } from '../recognition/geometry.js';

export interface HandSlots {
  leftHand: Point3D[] | null;
  rightHand: Point3D[] | null;
  handsCount: number;
}

/**
 * Assigns detected hands into fixed [Left, Right] slots.
 * Note on MediaPipe: MediaPipe returns handedness from the user's perspective
 * in the camera frame. When webcam video is mirrored (scaleX(-1)),
 * handedness 'Left' corresponds to the user's physical left hand.
 */
export function assignHandSlots(
  landmarksList: Point3D[][],
  handednessList: string[],
  isMirrored = true
): HandSlots {
  let leftHand: Point3D[] | null = null;
  let rightHand: Point3D[] | null = null;

  for (let i = 0; i < landmarksList.length; i++) {
    const rawHandedness = handednessList[i] || (i === 0 ? 'Right' : 'Left');
    const isLeft = isMirrored
      ? rawHandedness.toLowerCase().includes('left')
      : rawHandedness.toLowerCase().includes('right');

    if (isLeft && !leftHand) {
      leftHand = landmarksList[i];
    } else if (!rightHand) {
      rightHand = landmarksList[i];
    } else if (!leftHand) {
      leftHand = landmarksList[i];
    }
  }

  const handsCount = (leftHand ? 1 : 0) + (rightHand ? 1 : 0);

  return {
    leftHand,
    rightHand,
    handsCount,
  };
}
