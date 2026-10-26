import type { Point3D } from '../recognition/geometry.js';
import { distance3D } from '../recognition/geometry.js';
import { assignHandSlots } from './handOrdering.js';
import { normalizeHandLandmarks, type NormalizationOptions } from './normalize.js';

export const FEATURE_VECTOR_LENGTH = 131;

/**
 * Extracts a normalized, view-invariant fixed-length feature vector (131 floats) from hand landmarks.
 *
 * Feature Vector Layout (Total 131 dimensions):
 * [0 .. 62]   : Left Hand Normalized Landmarks (21 points x 3 [x, y, z]) - 63 floats (zero-filled if absent)
 * [63 .. 125] : Right Hand Normalized Landmarks (21 points x 3 [x, y, z]) - 63 floats (zero-filled if absent)
 * [126]       : Left Hand Presence Flag (1.0 = present, 0.0 = absent)
 * [127]       : Right Hand Presence Flag (1.0 = present, 0.0 = absent)
 * [128]       : Inter-wrist distance (normalized)
 * [129]       : Inter-index-fingertip distance (normalized)
 * [130]       : Relative wrist height delta (left.y - right.y)
 */
export function extractLandmarkFeatures(
  landmarksList: Point3D[][],
  handednessList: string[] = [],
  options: NormalizationOptions & { isMirrored?: boolean } = {}
): {
  features: number[];
  handsCount: number;
} {
  const { leftHand, rightHand, handsCount } = assignHandSlots(
    landmarksList,
    handednessList,
    options.isMirrored ?? true
  );

  const features: number[] = new Array(FEATURE_VECTOR_LENGTH).fill(0);

  // 1. Process Left Hand Slot (indices 0..62)
  if (leftHand && leftHand.length >= 21) {
    const normLeft = normalizeHandLandmarks(leftHand, options);
    for (let i = 0; i < 21; i++) {
      features[i * 3 + 0] = Number(normLeft[i].x.toFixed(4));
      features[i * 3 + 1] = Number(normLeft[i].y.toFixed(4));
      features[i * 3 + 2] = Number((normLeft[i].z || 0).toFixed(4));
    }
    features[126] = 1.0;
  }

  // 2. Process Right Hand Slot (indices 63..125)
  if (rightHand && rightHand.length >= 21) {
    const normRight = normalizeHandLandmarks(rightHand, options);
    for (let i = 0; i < 21; i++) {
      features[63 + i * 3 + 0] = Number(normRight[i].x.toFixed(4));
      features[63 + i * 3 + 1] = Number(normRight[i].y.toFixed(4));
      features[63 + i * 3 + 2] = Number((normRight[i].z || 0).toFixed(4));
    }
    features[127] = 1.0;
  }

  // 3. Process Relational Inter-Hand Features (indices 128..130)
  if (leftHand && rightHand && leftHand.length >= 21 && rightHand.length >= 21) {
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftIndex = leftHand[8];
    const rightIndex = rightHand[8];

    features[128] = Number(distance3D(leftWrist, rightWrist).toFixed(4));
    features[129] = Number(distance3D(leftIndex, rightIndex).toFixed(4));
    features[130] = Number((leftWrist.y - rightWrist.y).toFixed(4));
  }

  return {
    features,
    handsCount,
  };
}
