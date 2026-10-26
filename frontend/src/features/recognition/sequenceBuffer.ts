import { distance3D, type Point3D } from './geometry.js';

export interface BufferedFrame {
  timestamp: number;
  landmarks: Point3D[][]; // [handIndex][landmarkIndex]
  handedness: string[];
}

export interface MotionAnalysis {
  velocity: number; // average movement delta per millisecond
  isStableHold: boolean;
  isMovingFast: boolean;
  consecutiveStableMs: number;
}

export class RollingSequenceBuffer {
  private buffer: BufferedFrame[] = [];
  private maxBufferSize: number;
  private stableHoldThresholdVelocity: number; // pixels/normalized units per ms
  private stableHoldDurationMs: number;
  private stableStartTime: number | null = null;

  constructor(
    maxBufferSize = 25,
    stableHoldThresholdVelocity = 0.0006,
    stableHoldDurationMs = 300
  ) {
    this.maxBufferSize = maxBufferSize;
    this.stableHoldThresholdVelocity = stableHoldThresholdVelocity;
    this.stableHoldDurationMs = stableHoldDurationMs;
  }

  addFrame(timestamp: number, landmarks: Point3D[][], handedness: string[]): MotionAnalysis {
    const frame: BufferedFrame = {
      timestamp,
      landmarks,
      handedness,
    };

    this.buffer.push(frame);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    return this.analyzeMotion(timestamp);
  }

  getLatestFrame(): BufferedFrame | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  private analyzeMotion(currentTimestamp: number): MotionAnalysis {
    if (this.buffer.length < 2) {
      return {
        velocity: 0,
        isStableHold: false,
        isMovingFast: false,
        consecutiveStableMs: 0,
      };
    }

    const prevFrame = this.buffer[this.buffer.length - 2];
    const currFrame = this.buffer[this.buffer.length - 1];

    const dt = Math.max(1, currFrame.timestamp - prevFrame.timestamp);

    // If hands count changed or no hand in either frame, motion is discontinuous
    if (
      currFrame.landmarks.length === 0 ||
      prevFrame.landmarks.length === 0 ||
      currFrame.landmarks[0].length < 21 ||
      prevFrame.landmarks[0].length < 21
    ) {
      this.stableStartTime = null;
      return {
        velocity: 0,
        isStableHold: false,
        isMovingFast: false,
        consecutiveStableMs: 0,
      };
    }

    // Measure delta across primary hand's key joints (wrist, MCPs, tips)
    const keyJointIndices = [0, 4, 8, 12, 16, 20];
    let totalDelta = 0;
    const currHand = currFrame.landmarks[0];
    const prevHand = prevFrame.landmarks[0];

    for (const idx of keyJointIndices) {
      if (currHand[idx] && prevHand[idx]) {
        totalDelta += distance3D(currHand[idx], prevHand[idx]);
      }
    }

    const avgJointDelta = totalDelta / keyJointIndices.length;
    const velocity = avgJointDelta / dt;

    const isMovingFast = velocity > this.stableHoldThresholdVelocity * 2.5;
    const isQuiet = velocity <= this.stableHoldThresholdVelocity;

    if (isQuiet) {
      if (this.stableStartTime === null) {
        this.stableStartTime = currentTimestamp;
      }
    } else {
      this.stableStartTime = null;
    }

    const consecutiveStableMs =
      this.stableStartTime !== null ? currentTimestamp - this.stableStartTime : 0;
    const isStableHold = consecutiveStableMs >= this.stableHoldDurationMs;

    return {
      velocity,
      isStableHold,
      isMovingFast,
      consecutiveStableMs,
    };
  }

  reset() {
    this.buffer = [];
    this.stableStartTime = null;
  }
}
