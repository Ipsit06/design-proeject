import { HarshilAslAdapter } from './HarshilAslAdapter.js';
import { HarshilHciAdapter } from './HarshilHciAdapter.js';
import { GenericMediaPipeAdapter } from './GenericMediaPipeAdapter.js';
import { AslSignLanguageAdapter } from './AslSignLanguageAdapter.js';
import { CustomStaticModelAdapter } from './CustomStaticModelAdapter.js';
import { CustomSequenceModelAdapter } from './CustomSequenceModelAdapter.js';
import type { RecognitionAdapter } from './types.js';
import type { RecognitionMode } from '@signbridge/shared';

export * from './types.js';
export * from './HarshilAslAdapter.js';
export * from './HarshilHciAdapter.js';
export * from './GenericMediaPipeAdapter.js';
export * from './AslSignLanguageAdapter.js';
export * from './CustomStaticModelAdapter.js';
export * from './CustomSequenceModelAdapter.js';

export function getAdapterForMode(mode: RecognitionMode): RecognitionAdapter {
  switch (mode) {
    case 'harshil_asl':
      return new HarshilAslAdapter();
    case 'harshil_hci':
      return new HarshilHciAdapter();
    case 'generic':
      return new GenericMediaPipeAdapter();
    case 'custom_static':
      return new CustomStaticModelAdapter();
    case 'custom_sequence':
      return new CustomSequenceModelAdapter();
    case 'sign_language':
    default:
      return new HarshilAslAdapter();
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
    id: 'harshil_asl_model',
    name: 'Harshil ASL Writing (A-Z)',
    mode: 'harshil_asl',
    description: 'Neural network model trained on 21-joint 63-D features recognizing 26 ASL alphabet letters with stabilization and word buffer.',
    isGenuineSignLanguage: true,
  },
  {
    id: 'harshil_hci_model',
    name: 'Harshil HCI Studio (9 Gestures)',
    mode: 'harshil_hci',
    description: 'Real-time gesture control model: Volume Up/Down, Scroll Up, Virtual Mouse Cursor Tracking, Left/Right Click, and Zoom Mode.',
    isGenuineSignLanguage: false,
  },
  {
    id: 'custom_static_mlp',
    name: 'Custom Trained Model',
    mode: 'custom_static',
    description: 'TensorFlow.js neural network trained on user-collected landmark vectors.',
    isGenuineSignLanguage: true,
  },
  {
    id: 'mediapipe_generic',
    name: 'Generic Gestures Fallback',
    mode: 'generic',
    description: 'Pretrained MediaPipe baseline for universal postures.',
    isGenuineSignLanguage: false,
  },
];
