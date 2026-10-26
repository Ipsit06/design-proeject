import { GenericMediaPipeAdapter } from './GenericMediaPipeAdapter.js';
import { AslSignLanguageAdapter } from './AslSignLanguageAdapter.js';
import { CustomStaticModelAdapter } from './CustomStaticModelAdapter.js';
import { CustomSequenceModelAdapter } from './CustomSequenceModelAdapter.js';
import { SanketVideoAdapter } from './SanketVideoAdapter.js';
import type { RecognitionAdapter } from './types.js';
import type { RecognitionMode } from '@signbridge/shared';

export * from './types.js';
export * from './GenericMediaPipeAdapter.js';
export * from './AslSignLanguageAdapter.js';
export * from './CustomStaticModelAdapter.js';
export * from './CustomSequenceModelAdapter.js';
export * from './SanketVideoAdapter.js';

export function getAdapterForMode(mode: RecognitionMode): RecognitionAdapter {
  switch (mode) {
    case 'generic':
      return new GenericMediaPipeAdapter();
    case 'custom_static':
      return new CustomStaticModelAdapter();
    case 'custom_sequence':
      return new CustomSequenceModelAdapter();
    case 'sanket_video':
      return new SanketVideoAdapter();
    case 'sign_language':
    default:
      return new AslSignLanguageAdapter();
  }
}

export const AVAILABLE_ADAPTERS: Array<{
  id: string;
  name: string;
  mode: RecognitionMode;
  description: string;
  isGenuineSignLanguage: boolean;
  isExperimental?: boolean;
}> = [
  {
    id: 'asl_landmark_temporal',
    name: 'ASL Core Model',
    mode: 'sign_language',
    description: 'Biometric 3D joint geometries & canonical prototype matching for ASL letters and signs.',
    isGenuineSignLanguage: true,
  },
  {
    id: 'custom_static_mlp',
    name: 'Custom Signs (Static)',
    mode: 'custom_static',
    description: 'In-browser TensorFlow.js neural network trained on your collected landmark samples.',
    isGenuineSignLanguage: true,
  },
  {
    id: 'custom_sequence_dtw',
    name: 'Custom Signs (Sequence, Exp.)',
    mode: 'custom_sequence',
    description: 'Dynamic Time Warping template sequence model recognizing continuous motion signs.',
    isGenuineSignLanguage: true,
    isExperimental: true,
  },
  {
    id: 'mediapipe_generic',
    name: 'Generic Gestures',
    mode: 'generic',
    description: 'Pretrained baseline model for universal postures (Thumbs Up, Fist, Peace Sign).',
    isGenuineSignLanguage: false,
  },
];
