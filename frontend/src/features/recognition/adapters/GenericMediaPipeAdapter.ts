import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';

export class GenericMediaPipeAdapter implements RecognitionAdapter {
  id = 'mediapipe_generic';
  name = 'MediaPipe Generic Gestures';
  mode: 'generic' = 'generic';
  vocabularyId = 'generic_gestures';
  supportedLabels = [
    'Open_Palm',
    'Closed_Fist',
    'Thumb_Up',
    'Thumb_Down',
    'Pointing_Up',
    'Victory',
    'ILoveYou',
  ];

  processFrame(input: AdapterFrameInput): AdapterRecognitionResult | null {
    if (!input.rawGestures || input.rawGestures.length === 0 || input.rawGestures[0].length === 0) {
      return null;
    }

    const top = input.rawGestures[0][0];
    const category = top.categoryName;
    const score = top.score;

    if (!category || category === 'None' || score < input.confidenceThreshold) {
      return null;
    }

    // Suppress fast transition jitter
    if (input.velocity > 0.002) {
      return null;
    }

    const labelMap: Record<string, string> = {
      Open_Palm: 'Open Palm',
      Closed_Fist: 'Closed Fist',
      Thumb_Up: 'Thumbs Up',
      Thumb_Down: 'Thumbs Down',
      Pointing_Up: 'Pointing Up',
      Victory: 'Peace / Victory',
      ILoveYou: 'I Love You',
    };

    return {
      label: category,
      mappedText: labelMap[category] || category.replace(/_/g, ' '),
      confidence: score,
      startTimestamp: input.timestamp,
      endTimestamp: input.timestamp,
      mode: 'generic',
      isGenericGesture: true,
      vocabularyId: this.vocabularyId,
      hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
      notes: 'Generic hand posture recognized via pretrained MediaPipe model.',
    };
  }

  reset() {}
}
