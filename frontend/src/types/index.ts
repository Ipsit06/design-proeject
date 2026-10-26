export * from '@signbridge/shared';

export interface CameraState {
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

export interface RecognitionResult {
  category: string;
  score: number;
  landmarks: Array<Array<{ x: number; y: number; z: number }>>;
  handedness: string;
}

export type RecognitionStatus =
  | 'idle'
  | 'initializing'
  | 'detecting'
  | 'no_hand'
  | 'low_confidence'
  | 'recognized'
  | 'error';
