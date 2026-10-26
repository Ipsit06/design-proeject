import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';
import { extractLandmarkFeatures } from '../../landmarks/extractFeatures.js';
import { MotionSegmenter } from '../../sequence/motionSegmenter.js';
import { DtwSequenceClassifier, type SequenceTemplate } from '../../sequence/dtwBaseline.js';
import { samplesApi } from '../../../services/samplesApi.js';

export class CustomSequenceModelAdapter implements RecognitionAdapter {
  id = 'custom_sequence_dtw';
  name = 'Custom Signs (Sequence, Experimental)';
  mode: 'custom_sequence' = 'custom_sequence';
  vocabularyId = 'sequence_lexicon';
  supportedLabels: string[] = [];

  private segmenter = new MotionSegmenter();
  private dtwClassifier = new DtwSequenceClassifier();
  private isLoaded = false;
  private lastResult: AdapterRecognitionResult | null = null;

  async loadTemplates(): Promise<boolean> {
    try {
      const res = await samplesApi.list({ kind: 'sequence' });
      if (res.items.length > 0) {
        const templates: SequenceTemplate[] = res.items.map((s) => ({
          label: s.label,
          sequence: s.features as number[][],
        }));
        this.dtwClassifier.setTemplates(templates);
        this.supportedLabels = Array.from(new Set(res.items.map((s) => s.label)));
        this.isLoaded = true;
        return true;
      }
    } catch (e) {
      console.warn('[CustomSequenceModelAdapter] Failed to load sequence templates:', e);
    }
    return false;
  }

  processFrame(input: AdapterFrameInput): AdapterRecognitionResult | null {
    if (!this.isLoaded) {
      this.loadTemplates();
    }

    if (!input.landmarks || input.landmarks.length === 0 || input.landmarks[0].length < 21) {
      return null;
    }

    const { features } = extractLandmarkFeatures(input.landmarks, input.handedness);
    const { state, completedSequence } = this.segmenter.processFrame(
      features,
      input.velocity,
      input.timestamp
    );

    if (completedSequence && completedSequence.length >= 10) {
      const match = this.dtwClassifier.classify(completedSequence);
      if (match && match.confidence >= input.confidenceThreshold) {
        this.lastResult = {
          label: match.label,
          mappedText: match.label.replace(/^ASL_|^ISL_/, '').replace(/_/g, ' '),
          confidence: match.confidence,
          startTimestamp: input.timestamp,
          endTimestamp: input.timestamp,
          mode: 'custom_sequence',
          isGenericGesture: false,
          vocabularyId: this.vocabularyId,
          hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
          notes: `DTW Temporal Template Match (distance: ${match.distance})`,
        };
        return this.lastResult;
      }
    }

    return null;
  }

  getSegmenterState() {
    return this.segmenter.getState();
  }

  reset() {
    this.segmenter.reset();
    this.lastResult = null;
  }
}
