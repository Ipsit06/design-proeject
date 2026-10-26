export type MotionSegmentState = 'WAITING' | 'CAPTURING' | 'CLASSIFYING' | 'RESULT';

export interface MotionSegmenterOptions {
  motionStartThreshold?: number;
  motionEndThreshold?: number;
  minFrames?: number;
  maxFrames?: number;
  silenceDurationMs?: number;
}

export class MotionSegmenter {
  private state: MotionSegmentState = 'WAITING';
  private capturedFrames: number[][] = [];
  private silenceStartTime: number | null = null;
  private options: Required<MotionSegmenterOptions>;

  constructor(options: MotionSegmenterOptions = {}) {
    this.options = {
      motionStartThreshold: options.motionStartThreshold ?? 0.0012,
      motionEndThreshold: options.motionEndThreshold ?? 0.0007,
      minFrames: options.minFrames ?? 12,
      maxFrames: options.maxFrames ?? 35,
      silenceDurationMs: options.silenceDurationMs ?? 250,
    };
  }

  processFrame(
    features: number[],
    velocity: number,
    timestamp: number
  ): {
    state: MotionSegmentState;
    completedSequence: number[][] | null;
  } {
    let completedSequence: number[][] | null = null;

    switch (this.state) {
      case 'WAITING':
        // Start capturing when hand movement accelerates
        if (velocity >= this.options.motionStartThreshold) {
          this.state = 'CAPTURING';
          this.capturedFrames = [[...features]];
          this.silenceStartTime = null;
        }
        break;

      case 'CAPTURING':
        this.capturedFrames.push([...features]);

        // Check if movement stopped
        if (velocity <= this.options.motionEndThreshold) {
          if (this.silenceStartTime === null) {
            this.silenceStartTime = timestamp;
          } else if (timestamp - this.silenceStartTime >= this.options.silenceDurationMs) {
            // Motion ended
            if (this.capturedFrames.length >= this.options.minFrames) {
              completedSequence = [...this.capturedFrames];
              this.state = 'CLASSIFYING';
            } else {
              // Too short, discard
              this.state = 'WAITING';
            }
            this.capturedFrames = [];
            this.silenceStartTime = null;
          }
        } else {
          this.silenceStartTime = null;
        }

        // Limit maximum sequence length
        if (this.capturedFrames.length >= this.options.maxFrames) {
          completedSequence = [...this.capturedFrames];
          this.state = 'CLASSIFYING';
          this.capturedFrames = [];
          this.silenceStartTime = null;
        }
        break;

      case 'CLASSIFYING':
      case 'RESULT':
        // Ready for next sequence
        this.state = 'WAITING';
        break;
    }

    return {
      state: this.state,
      completedSequence,
    };
  }

  getState(): MotionSegmentState {
    return this.state;
  }

  reset() {
    this.state = 'WAITING';
    this.capturedFrames = [];
    this.silenceStartTime = null;
  }
}
