import { describe, it, expect } from 'vitest';
import { normalizeHandLandmarks } from '../features/landmarks/normalize.js';
import { assignHandSlots } from '../features/landmarks/handOrdering.js';
import {
  extractLandmarkFeatures,
  FEATURE_VECTOR_LENGTH,
} from '../features/landmarks/extractFeatures.js';
import { augmentFeatureVector } from '../features/landmarks/augment.js';
import { computeDtwDistance } from '../features/sequence/dtwBaseline.js';
import { MotionSegmenter } from '../features/sequence/motionSegmenter.js';
import type { Point3D } from '../features/recognition/geometry.js';

describe('SignBridge v2 Limitation-Reduction Pipeline Tests', () => {
  // Mock 21-point hand
  const createMockHand = (offsetX = 0, offsetY = 0): Point3D[] => {
    return Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + offsetX + (i % 5) * 0.02,
      y: 0.5 + offsetY + Math.floor(i / 5) * 0.03,
      z: 0.01 * i,
    }));
  };

  describe('Hand Normalization & Hand Ordering', () => {
    it('translates wrist (joint 0) to origin (0, 0, 0)', () => {
      const rawHand = createMockHand(0.1, 0.2);
      const normalized = normalizeHandLandmarks(rawHand, { enableInPlaneRotation: false });

      expect(normalized[0].x).toBeCloseTo(0, 5);
      expect(normalized[0].y).toBeCloseTo(0, 5);
      expect(normalized[0].z).toBeCloseTo(0, 5);
    });

    it('assigns handedness correctly for single right hand', () => {
      const hand = createMockHand();
      const slots = assignHandSlots([hand], ['Right']);

      expect(slots.rightHand).not.toBeNull();
      expect(slots.leftHand).toBeNull();
      expect(slots.handsCount).toBe(1);
    });

    it('assigns both hands when two hands are present', () => {
      const hand1 = createMockHand(-0.2, 0);
      const hand2 = createMockHand(0.2, 0);
      const slots = assignHandSlots([hand1, hand2], ['Left', 'Right']);

      expect(slots.leftHand).not.toBeNull();
      expect(slots.rightHand).not.toBeNull();
      expect(slots.handsCount).toBe(2);
    });
  });

  describe('131-D Feature Vector Extraction', () => {
    it('produces an exact 131-dimension vector for single hand', () => {
      const hand = createMockHand();
      const { features, handsCount } = extractLandmarkFeatures([hand], ['Right']);

      expect(features.length).toBe(FEATURE_VECTOR_LENGTH);
      expect(features.length).toBe(131);
      expect(handsCount).toBe(1);

      // Presence flags: leftPresent = 0, rightPresent = 1 (after mirroring right hand is in right slot)
      expect(features[126] + features[127]).toBe(1);
    });

    it('computes inter-wrist distance when both hands are present', () => {
      const handL = createMockHand(-0.1, 0);
      const handR = createMockHand(0.1, 0);
      const { features, handsCount } = extractLandmarkFeatures([handL, handR], ['Left', 'Right']);

      expect(features.length).toBe(131);
      expect(handsCount).toBe(2);
      expect(features[126]).toBe(1); // Left present
      expect(features[127]).toBe(1); // Right present
      expect(features[128]).toBeGreaterThan(0); // Inter-wrist distance
    });
  });

  describe('Feature Vector Augmentation', () => {
    it('maintains 131 dimensions after augmentation', () => {
      const hand = createMockHand();
      const { features } = extractLandmarkFeatures([hand], ['Right']);
      const augmented = augmentFeatureVector(features, {
        jitterStd: 0.01,
        rotationMaxDeg: 10,
      });

      expect(augmented.length).toBe(131);
      expect(augmented).not.toEqual(features); // Jitter applied
    });
  });

  describe('DTW Baseline & Motion Segmenter', () => {
    it('calculates zero distance for identical temporal sequences', () => {
      const seq: number[][] = [
        new Array(131).fill(0.1),
        new Array(131).fill(0.2),
        new Array(131).fill(0.3),
      ];
      const dist = computeDtwDistance(seq, seq);
      expect(dist).toBe(0);
    });

    it('calculates non-zero distance for distinct sequences', () => {
      const seqA: number[][] = [new Array(131).fill(0.1), new Array(131).fill(0.2)];
      const seqB: number[][] = [new Array(131).fill(0.8), new Array(131).fill(0.9)];
      const dist = computeDtwDistance(seqA, seqB);
      expect(dist).toBeGreaterThan(0);
    });

    it('segments motion when velocity exceeds threshold', () => {
      const segmenter = new MotionSegmenter({
        motionStartThreshold: 0.001,
        motionEndThreshold: 0.0005,
        minFrames: 2,
        maxFrames: 10,
        silenceDurationMs: 100,
      });

      const frame = new Array(131).fill(0.5);

      // 1. Initial still frame: state should be WAITING
      const r1 = segmenter.processFrame(frame, 0.0002, 1000);
      expect(r1.state).toBe('WAITING');

      // 2. High motion frame: transitions to CAPTURING
      const r2 = segmenter.processFrame(frame, 0.0025, 1050);
      expect(r2.state).toBe('CAPTURING');
    });
  });
});
