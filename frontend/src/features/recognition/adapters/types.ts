import type { Point3D } from '../geometry.js';
import type { RecognitionMode } from '@signbridge/shared';

export interface AdapterFrameInput {
  timestamp: number;
  landmarks: Point3D[][];
  handedness: string[];
  rawGestures?: Array<Array<{ categoryName: string; score: number }>>;
  velocity: number;
  isStableHold: boolean;
  confidenceThreshold: number;
}

export interface AdapterRecognitionResult {
  label: string;
  mappedText: string;
  confidence: number;
  startTimestamp?: number;
  endTimestamp?: number;
  mode: RecognitionMode;
  isGenericGesture: boolean;
  vocabularyId: string;
  hand?: 'Left' | 'Right' | 'Both';
  isUncertain?: boolean;
  notes?: string;
}

export interface RecognitionAdapter {
  id: string;
  name: string;
  mode: RecognitionMode;
  vocabularyId: string;
  supportedLabels: string[];
  loadModel?: (modelId?: string) => Promise<boolean>;
  processFrame: (input: AdapterFrameInput) => AdapterRecognitionResult | null;
  reset: () => void;
}
