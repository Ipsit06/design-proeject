import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';

export class SanketVideoAdapter implements RecognitionAdapter {
  id = 'sanket_video';
  name = 'Sanket ISL Video Translator';
  mode: 'sanket_video' = 'sanket_video';
  vocabularyId = 'include';
  supportedLabels: string[] = [];

  processFrame(_input: AdapterFrameInput): AdapterRecognitionResult | null {
    return null;
  }

  reset() {}
}
