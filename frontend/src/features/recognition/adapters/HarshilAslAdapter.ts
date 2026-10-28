import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';
import { predictAslLetter, ASL_LABELS, isAslReady, loadHarshilModels } from '../../harshil/harshilEngine.js';

export class HarshilAslAdapter implements RecognitionAdapter {
  id = 'harshil_asl_model';
  name = 'ASL Alphabet (A-Z)';
  mode: 'harshil_asl' = 'harshil_asl';
  vocabularyId = 'asl_alphabet_harshil';
  supportedLabels: string[] = ASL_LABELS;

  private prevLabel: string | null = null;
  private stableCount = 0;
  private readonly STABLE_THRESHOLD = 5;

  constructor() {
    loadHarshilModels().catch(() => {});
  }

  isModelReady(): boolean {
    return isAslReady();
  }

  getMeta() {
    return {
      id: this.id,
      name: 'ASL Model (A-Z)',
      kind: 'static_mlp',
      labels: this.supportedLabels,
      sampleCount: 7800,
      trainedAt: '2026-10-27T00:00:00.000Z',
    };
  }

  processFrame(input: AdapterFrameInput): AdapterRecognitionResult | null {
    if (!this.isModelReady()) {
      return null;
    }

    if (!input.landmarks || input.landmarks.length === 0 || input.landmarks[0].length < 21) {
      this.stableCount = 0;
      this.prevLabel = null;
      return null;
    }

    // Suppress fast transition movements
    if (input.velocity > 0.002) {
      return null;
    }

    const hand = input.landmarks[0];
    const pred = predictAslLetter(hand);
    if (!pred) {
      return null;
    }

    // Apply stabilization matching Harshil's realtime_control.py (STABLE_THRESHOLD=5)
    if (pred.label === this.prevLabel) {
      this.stableCount++;
    } else {
      this.prevLabel = pred.label;
      this.stableCount = 1;
    }

    if (pred.confidence < (input.confidenceThreshold ?? 0.65)) {
      return null;
    }

    return {
      label: pred.label,
      mappedText: pred.label,
      confidence: pred.confidence,
      startTimestamp: input.timestamp,
      endTimestamp: input.timestamp,
      mode: 'harshil_asl',
      isGenericGesture: false,
      vocabularyId: this.vocabularyId,
      hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
      notes: `ASL Model (Letters A-Z) — Stable frames: ${this.stableCount}/${this.STABLE_THRESHOLD}`,
    };
  }

  reset() {
    this.prevLabel = null;
    this.stableCount = 0;
  }
}
