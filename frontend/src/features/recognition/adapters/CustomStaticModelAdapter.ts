import * as tf from '@tensorflow/tfjs';
import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';
import { extractLandmarkFeatures } from '../../landmarks/extractFeatures.js';
import { normalizeHandLandmarks } from '../../landmarks/normalize.js';
import { loadModelFromIndexedDb, getActiveModelId } from '../../training/modelStore.js';
import type { TrainedModelMeta } from '@signbridge/shared';

export class CustomStaticModelAdapter implements RecognitionAdapter {
  id = 'custom_static_mlp';
  name = 'Custom Trained Model (Static)';
  mode: 'custom_static' = 'custom_static';
  vocabularyId = 'custom_lexicon';
  supportedLabels: string[] = [];

  private model: tf.LayersModel | null = null;
  private meta: TrainedModelMeta | null = null;
  private isLoaded = false;
  private isAttemptingLoad = false;

  async loadModel(modelId?: string): Promise<boolean> {
    const targetId = modelId || getActiveModelId();
    if (!targetId) return false;

    this.isAttemptingLoad = true;
    try {
      const res = await loadModelFromIndexedDb(targetId);
      if (res && res.model) {
        this.model = res.model;
        this.meta = res.meta;
        this.supportedLabels = res.meta?.labels || [];
        this.isLoaded = true;
        return true;
      }
    } catch (e) {
      console.warn('[CustomStaticModelAdapter] Load failed:', e);
    } finally {
      this.isAttemptingLoad = false;
    }
    return false;
  }

  isModelReady(): boolean {
    return this.isLoaded && this.model !== null;
  }

  getMeta(): TrainedModelMeta | null {
    return this.meta;
  }

  processFrame(input: AdapterFrameInput): AdapterRecognitionResult | null {
    if (!this.model || !this.meta || !this.meta.labels || this.meta.labels.length === 0) {
      if (!this.isLoaded && !this.isAttemptingLoad) {
        this.loadModel();
      }
      return null;
    }

    if (!input.landmarks || input.landmarks.length === 0 || input.landmarks[0].length < 21) {
      return null;
    }

    // Suppress fast transition movements
    if (input.velocity > 0.0018) {
      return null;
    }

    // 1. Extract features matching model input dimension (63 or 131)
    const expectedDim = this.model.inputs[0]?.shape[1] || 131;
    let modelFeatures: number[];

    if (expectedDim === 63) {
      const primaryHand = input.landmarks[0];
      const normHand = normalizeHandLandmarks(primaryHand);
      modelFeatures = new Array(63);
      for (let i = 0; i < 21; i++) {
        modelFeatures[i * 3 + 0] = Number(normHand[i].x.toFixed(4));
        modelFeatures[i * 3 + 1] = Number(normHand[i].y.toFixed(4));
        modelFeatures[i * 3 + 2] = Number((normHand[i].z || 0).toFixed(4));
      }
    } else {
      const { features } = extractLandmarkFeatures(input.landmarks, input.handedness);
      modelFeatures = features;
    }

    // 2. Predict using TensorFlow.js
    let topLabel = '';
    let topScore = 0;

    tf.tidy(() => {
      const inputTensor = tf.tensor2d([modelFeatures]);
      const pred = this.model!.predict(inputTensor) as tf.Tensor;
      const scores = pred.dataSync();

      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > topScore) {
          topScore = scores[i];
          topLabel = this.meta!.labels[i] || `Class_${i}`;
        }
      }
    });

    // Custom models trained from the imported ISL images are calibrated
    // separately from MediaPipe's confidence score. Keep a lower floor so
    // useful predictions can reach the temporal debouncer.
    const minimumScore = Math.min(input.confidenceThreshold, 0.35);
    if (topScore < minimumScore || !topLabel) {
      return null;
    }

    return {
      label: topLabel,
      mappedText: topLabel.replace(/^ASL_|^ISL_/, '').replace(/_/g, ' '),
      confidence: Number(topScore.toFixed(3)),
      startTimestamp: input.timestamp,
      endTimestamp: input.timestamp,
      mode: 'custom_static',
      isGenericGesture: false,
      vocabularyId: this.vocabularyId,
      hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
      notes: `Custom trained model: ${this.meta.name} (Val Acc: ${(this.meta.metrics.valAccuracy! * 100).toFixed(0)}%)`,
    };
  }

  reset() {}
}
