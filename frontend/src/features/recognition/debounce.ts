export interface DebounceConfig {
  requiredConsecutiveFrames: number;
}

export class GestureDebouncer {
  private candidateCategory: string | null = null;
  private candidateScore: number = 0;
  private consecutiveCount: number = 0;
  private currentStableCategory: string | null = null;
  private currentStableScore: number = 0;
  private requiredFrames: number;

  constructor(requiredFrames = 5) {
    this.requiredFrames = requiredFrames;
  }

  setRequiredFrames(frames: number) {
    this.requiredFrames = Math.max(1, frames);
  }

  process(rawCategory: string | null, rawScore: number = 0): {
    stableCategory: string | null;
    stableScore: number;
    isNewGesture: boolean;
  } {
    if (!rawCategory || rawCategory === 'None') {
      this.consecutiveCount = 0;
      this.candidateCategory = null;
      return {
        stableCategory: this.currentStableCategory,
        stableScore: this.currentStableScore,
        isNewGesture: false,
      };
    }

    if (rawCategory === this.candidateCategory) {
      this.consecutiveCount += 1;
    } else {
      this.candidateCategory = rawCategory;
      this.candidateScore = rawScore;
      this.consecutiveCount = 1;
    }

    let isNewGesture = false;

    if (this.consecutiveCount >= this.requiredFrames) {
      if (this.currentStableCategory !== this.candidateCategory) {
        this.currentStableCategory = this.candidateCategory;
        this.currentStableScore = this.candidateScore;
        isNewGesture = true;
      } else {
        // Update score with latest
        this.currentStableScore = rawScore;
      }
    }

    return {
      stableCategory: this.currentStableCategory,
      stableScore: this.currentStableScore,
      isNewGesture,
    };
  }

  reset() {
    this.candidateCategory = null;
    this.candidateScore = 0;
    this.consecutiveCount = 0;
    this.currentStableCategory = null;
    this.currentStableScore = 0;
  }
}
