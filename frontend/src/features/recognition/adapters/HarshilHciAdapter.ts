import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';
import { predictHciGesture, HCI_LABELS, isHciReady, loadHarshilModels } from '../../harshil/harshilEngine.js';

const GESTURE_NAME_MAP: Record<string, string> = {
  open_palm: 'Open Palm (Scroll Up)',
  fist: 'Fist (Idle / Deactivate)',
  two_fingers: 'Two Fingers (Cursor Tracking)',
  pointing: 'Pointing',
  thumbs_up: 'Thumbs Up (Volume Up)',
  thumbs_down: 'Thumbs Down (Volume Down)',
  victory: 'Victory (Zoom Mode)',
  ok_sign: 'OK Sign (Right Click)',
  pinch: 'Pinch (Left Click)',
};

export class HarshilHciAdapter implements RecognitionAdapter {
  id = 'harshil_hci_model';
  name = 'Harshil HCI Studio (9 Gestures)';
  mode: 'harshil_hci' = 'harshil_hci';
  vocabularyId = 'hci_gestures_harshil';
  supportedLabels: string[] = HCI_LABELS;

  private prevLabel: string | null = null;
  private stableCount = 0;
  private readonly STABLE_THRESHOLD = 4;

  constructor() {
    loadHarshilModels().catch(() => {});
  }

  isModelReady(): boolean {
    return isHciReady();
  }

  getMeta() {
    return {
      id: this.id,
      name: 'Harshil Gesture HCI Model',
      kind: 'static_mlp',
      labels: this.supportedLabels,
      sampleCount: 2700,
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

    const hand = input.landmarks[0];
    const pred = predictHciGesture(hand);
    if (!pred) {
      return null;
    }

    if (pred.label === this.prevLabel) {
      this.stableCount++;
    } else {
      this.prevLabel = pred.label;
      this.stableCount = 1;
    }

    if (pred.confidence < (input.confidenceThreshold ?? 0.6)) {
      return null;
    }

    const friendlyText = GESTURE_NAME_MAP[pred.label] || pred.label;

    return {
      label: pred.label,
      mappedText: friendlyText,
      confidence: pred.confidence,
      startTimestamp: input.timestamp,
      endTimestamp: input.timestamp,
      mode: 'harshil_hci',
      isGenericGesture: true,
      vocabularyId: this.vocabularyId,
      hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
      notes: `Harshil HCI Gesture: ${pred.label} (${(pred.confidence * 100).toFixed(0)}%)`,
    };
  }

  reset() {
    this.prevLabel = null;
    this.stableCount = 0;
  }
}
