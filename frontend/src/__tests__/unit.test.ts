import { describe, it, expect, vi } from 'vitest';
import { GestureDebouncer } from '../features/recognition/debounce.js';
import { distance3D, angle3D, analyzeHandGeometry, type Point3D } from '../features/recognition/geometry.js';
import { RollingSequenceBuffer } from '../features/recognition/sequenceBuffer.js';
import { AslSignLanguageAdapter } from '../features/recognition/adapters/AslSignLanguageAdapter.js';
import { GenericMediaPipeAdapter } from '../features/recognition/adapters/GenericMediaPipeAdapter.js';
import { SequenceManager } from '../features/translation/sequenceManager.js';
import { ApiError, apiRequest } from '../services/apiClient.js';

describe('SignBridge Upgraded Pipeline Unit Tests', () => {
  describe('Geometric Invariants & Mathematics', () => {
    it('computes 3D Euclidean distance correctly', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 3, y: 4, z: 0 };
      expect(distance3D(p1, p2)).toBe(5);
    });

    it('computes 3D angle correctly for right angle', () => {
      const p1: Point3D = { x: 0, y: 1, z: 0 };
      const vertex: Point3D = { x: 0, y: 0, z: 0 };
      const p3: Point3D = { x: 1, y: 0, z: 0 };
      expect(Math.round(angle3D(p1, vertex, p3))).toBe(90);
    });

    it('returns null for incomplete landmark arrays', () => {
      expect(analyzeHandGeometry([])).toBeNull();
      expect(analyzeHandGeometry(new Array(10).fill({ x: 0, y: 0, z: 0 }))).toBeNull();
    });
  });

  describe('RollingSequenceBuffer & Temporal Motion', () => {
    it('detects stable hold when consecutive frames have low velocity', () => {
      const buffer = new RollingSequenceBuffer(10, 0.001, 100);

      // Create static hand points
      const staticPoints: Point3D[] = new Array(21).fill(null).map((_, i) => ({
        x: 0.5 + i * 0.01,
        y: 0.5 + i * 0.01,
        z: 0,
      }));

      // Frame 1
      buffer.addFrame(1000, [staticPoints], ['Right']);
      // Frame 2 (same position, dt = 50ms)
      const res2 = buffer.addFrame(1050, [staticPoints], ['Right']);
      expect(res2.velocity).toBe(0);

      // Frame 3 (dt = 150ms total, exceeds 100ms hold)
      const res3 = buffer.addFrame(1160, [staticPoints], ['Right']);
      expect(res3.isStableHold).toBe(true);
    });

    it('detects fast movement and flags isMovingFast', () => {
      const buffer = new RollingSequenceBuffer(10, 0.0005, 200);

      const pointsA: Point3D[] = new Array(21).fill({ x: 0.2, y: 0.2, z: 0 });
      const pointsB: Point3D[] = new Array(21).fill({ x: 0.8, y: 0.8, z: 0 }); // large jump

      buffer.addFrame(1000, [pointsA], ['Right']);
      const res = buffer.addFrame(1010, [pointsB], ['Right']); // jump in 10ms
      expect(res.velocity).toBeGreaterThan(0.001);
      expect(res.isMovingFast).toBe(true);
      expect(res.isStableHold).toBe(false);
    });
  });

  describe('Model Adapters Architecture', () => {
    it('GenericMediaPipeAdapter extracts top category and sets isGenericGesture true', () => {
      const adapter = new GenericMediaPipeAdapter();
      const res = adapter.processFrame({
        timestamp: 1000,
        landmarks: [],
        handedness: ['Right'],
        rawGestures: [[{ categoryName: 'Thumb_Up', score: 0.95 }]],
        velocity: 0.0001,
        isStableHold: true,
        confidenceThreshold: 0.65,
      });

      expect(res).not.toBeNull();
      expect(res?.label).toBe('Thumb_Up');
      expect(res?.isGenericGesture).toBe(true);
      expect(res?.mode).toBe('generic');
    });

    it('GenericMediaPipeAdapter suppresses detection during rapid velocity transitions', () => {
      const adapter = new GenericMediaPipeAdapter();
      const res = adapter.processFrame({
        timestamp: 1000,
        landmarks: [],
        handedness: ['Right'],
        rawGestures: [[{ categoryName: 'Thumb_Up', score: 0.95 }]],
        velocity: 0.005, // very fast
        isStableHold: false,
        confidenceThreshold: 0.65,
      });

      expect(res).toBeNull();
    });

    it('AslSignLanguageAdapter suppresses detection when no hand or uncertain', () => {
      const adapter = new AslSignLanguageAdapter();
      const res = adapter.processFrame({
        timestamp: 1000,
        landmarks: [],
        handedness: ['Right'],
        velocity: 0,
        isStableHold: true,
        confidenceThreshold: 0.65,
      });
      expect(res).toBeNull();
    });
  });

  describe('Chronological SequenceManager', () => {
    it('accumulates tokens and suppresses immediate duplicate repeats', () => {
      const manager = new SequenceManager();

      // Token 1
      const added1 = manager.addToken({
        label: 'ASL_HELLO',
        text: 'Hello',
        confidence: 0.95,
        timestamp: 1000,
        mode: 'sign_language',
      });
      expect(added1).toBe(true);

      // Immediate duplicate frame (timestamp + 100ms)
      const addedDuplicate = manager.addToken({
        label: 'ASL_HELLO',
        text: 'Hello',
        confidence: 0.95,
        timestamp: 1100,
        mode: 'sign_language',
      });
      expect(addedDuplicate).toBe(false);
      expect(manager.getTokens().length).toBe(1);

      // Different token
      const added2 = manager.addToken({
        label: 'ASL_A',
        text: 'A',
        confidence: 0.92,
        timestamp: 1200,
        mode: 'sign_language',
      });
      expect(added2).toBe(true);
      expect(manager.getTokens().length).toBe(2);
      expect(manager.getRawSentence()).toBe('Hello A');
    });

    it('removes last token when undo is called', () => {
      const manager = new SequenceManager();
      manager.addToken({
        label: 'ASL_A',
        text: 'A',
        confidence: 0.9,
        timestamp: 1000,
        mode: 'sign_language',
      });
      manager.addToken({
        label: 'ASL_B',
        text: 'B',
        confidence: 0.9,
        timestamp: 1100,
        mode: 'sign_language',
      });
      expect(manager.getTokens().length).toBe(2);

      const removed = manager.removeLastToken();
      expect(removed?.text).toBe('B');
      expect(manager.getTokens().length).toBe(1);
    });
  });

  describe('ApiClient & Error Handling', () => {
    it('constructs ApiError with proper status and code', () => {
      const err = new ApiError('Forbidden', 403, 'FORBIDDEN');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('apiRequest catches network failures and normalizes BACKEND_OFFLINE', async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      try {
        await expect(apiRequest('/test')).rejects.toThrow();
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
});
