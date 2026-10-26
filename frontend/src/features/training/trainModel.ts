import * as tf from '@tensorflow/tfjs';
import { buildStaticMlpModel } from './buildModel.js';
import { augmentFeatureVector } from '../landmarks/augment.js';
import { saveModelToIndexedDb } from './modelStore.js';
import type { Sample, ModelMetrics, TrainedModelMeta } from '@signbridge/shared';

export interface TrainProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  valLoss?: number;
  valAccuracy?: number;
}

export interface TrainingOptions {
  modelName: string;
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
  applyAugmentation?: boolean;
  maxSamplesPerClass?: number;
  onProgress?: (progress: TrainProgress) => void;
}

export interface TrainingResult {
  meta: TrainedModelMeta;
  metrics: ModelMetrics;
}

export async function trainCustomModel(
  samples: Sample[],
  options: TrainingOptions
): Promise<TrainingResult> {
  const epochs = options.epochs ?? 35;
  const batchSize = options.batchSize ?? 16;
  const applyAugmentation = options.applyAugmentation ?? true;

  const featureLength = samples.find((s) => Array.isArray(s.features))?.features.length;
  if (!featureLength) {
    throw new Error('No valid landmark feature vectors are available for training.');
  }

  const validSamples = samples.filter(
    (sample) =>
      sample.kind === 'static' &&
      Array.isArray(sample.features) &&
      sample.features.length === featureLength &&
      sample.features.every((value) => Number.isFinite(value))
  );

  const counts = new Map<string, number>();
  for (const sample of validSamples) {
    counts.set(sample.label, (counts.get(sample.label) || 0) + 1);
  }
  const eligibleLabels = Array.from(counts.entries())
    .filter(([, count]) => count >= 10)
    .map(([label]) => label)
    .sort();
  const maxSamplesPerClass = options.maxSamplesPerClass ?? 300;
  const balancedSamples = eligibleLabels.flatMap((label) =>
    validSamples.filter((sample) => sample.label === label).slice(0, maxSamplesPerClass)
  );

  // 1. Extract unique labels (sorted) after removing incomplete and tiny classes.
  const labelSet = eligibleLabels;
  if (labelSet.length < 2) {
    throw new Error('Training requires at least 2 sign classes with 10 valid samples each.');
  }

  const labelToIndex = new Map(labelSet.map((l, i) => [l, i]));

  // 2. Session-aware train / validation split.
  // Hold out complete recording sessions so adjacent frames cannot leak across
  // train and validation and inflate the reported accuracy.
  const trainSamples: Sample[] = [];
  const valSamples: Sample[] = [];

  for (const label of labelSet) {
    const classSamples = balancedSamples.filter((s) => s.label === label);
    const sessionGroups = new Map<string, Sample[]>();
    for (const sample of classSamples) {
      const session = sample.sessionId || `sample-${sample.id}`;
      const group = sessionGroups.get(session) || [];
      group.push(sample);
      sessionGroups.set(session, group);
    }

    const groups = Array.from(sessionGroups.values());
    if (groups.length >= 2) {
      const validationGroupCount = Math.max(1, Math.floor(groups.length * 0.2));
      const splitIndex = Math.max(1, groups.length - validationGroupCount);
      trainSamples.push(...groups.slice(0, splitIndex).flat());
      valSamples.push(...groups.slice(splitIndex).flat());
    } else {
      const splitIndex = Math.max(1, Math.floor(classSamples.length * 0.8));
      trainSamples.push(...classSamples.slice(0, splitIndex));
      valSamples.push(...classSamples.slice(splitIndex));
    }
  }

  if (valSamples.length === 0) {
    // If very small dataset, ensure at least 1 sample per class in val
    for (const label of labelSet) {
      const idx = trainSamples.findIndex((s) => s.label === label);
      if (idx !== -1) {
        valSamples.push(trainSamples.splice(idx, 1)[0]);
      }
    }
  }

  // 3. Prepare Training Tensors with optional data augmentation
  const trainXData: number[][] = [];
  const trainYData: number[][] = [];

  for (const s of trainSamples) {
    const rawFeat = s.features as number[];
    const classIdx = labelToIndex.get(s.label)!;
    const oneHot = new Array(labelSet.length).fill(0);
    oneHot[classIdx] = 1;

    // Original sample
    trainXData.push(rawFeat);
    trainYData.push(oneHot);

    // Add augmented copy if enabled
    if (applyAugmentation) {
      const aug1 = augmentFeatureVector(rawFeat, { rotationMaxDeg: 6, jitterStd: 0.01 });
      trainXData.push(aug1);
      trainYData.push(oneHot);
    }
  }

  const valXData: number[][] = [];
  const valYData: number[][] = [];

  for (const s of valSamples) {
    const rawFeat = s.features as number[];
    const classIdx = labelToIndex.get(s.label)!;
    const oneHot = new Array(labelSet.length).fill(0);
    oneHot[classIdx] = 1;

    // Validation samples are NEVER augmented (real test data)
    valXData.push(rawFeat);
    valYData.push(oneHot);
  }

  const trainTensors = {
    x: tf.tensor2d(trainXData),
    y: tf.tensor2d(trainYData),
  };

  const valTensors = {
    x: tf.tensor2d(valXData),
    y: tf.tensor2d(valYData),
  };

  // 4. Build Model
  const inputDim = trainXData[0]?.length || 131;
  const model = buildStaticMlpModel(labelSet.length, inputDim);

  let bestValAcc = 0;
  let bestValLoss = 1e9;

  // 5. Training Loop
  await model.fit(trainTensors.x, trainTensors.y, {
    epochs,
    batchSize,
    validationData: [valTensors.x, valTensors.y],
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const loss = logs?.loss || 0;
        const accuracy = logs?.acc || 0;
        const valLoss = logs?.val_loss;
        const valAccuracy = logs?.val_acc;

        if (typeof valAccuracy === 'number' && valAccuracy > bestValAcc) {
          bestValAcc = valAccuracy;
        }
        if (typeof valLoss === 'number' && valLoss < bestValLoss) {
          bestValLoss = valLoss;
        }

        options.onProgress?.({
          epoch: epoch + 1,
          totalEpochs: epochs,
          loss,
          accuracy,
          valLoss,
          valAccuracy,
        });
      },
    },
  });

  // 6. Compute Real Confusion Matrix and Per-Class Metrics on Validation Set
  const valPredsTensor = model.predict(valTensors.x) as tf.Tensor;
  const valPredIndices = (await valPredsTensor.argMax(-1).data()) as Int32Array;
  const valTrueIndices = (await valTensors.y.argMax(-1).data()) as Int32Array;

  const numClasses = labelSet.length;
  const confusionMatrix: number[][] = Array.from({ length: numClasses }, () =>
    new Array(numClasses).fill(0)
  );

  let correctCount = 0;
  for (let i = 0; i < valTrueIndices.length; i++) {
    const trueC = valTrueIndices[i];
    const predC = valPredIndices[i];
    confusionMatrix[trueC][predC] += 1;
    if (trueC === predC) correctCount += 1;
  }

  const realValAccuracy = valTrueIndices.length > 0 ? correctCount / valTrueIndices.length : 0;

  // Per-class precision & recall
  const perClass: Record<string, { precision: number; recall: number; f1: number; count: number }> = {};
  for (let c = 0; c < numClasses; c++) {
    const className = labelSet[c];
    const tp = confusionMatrix[c][c];
    let totalPred = 0;
    let totalTrue = 0;
    for (let r = 0; r < numClasses; r++) {
      totalTrue += confusionMatrix[c][r];
      totalPred += confusionMatrix[r][c];
    }

    const precision = totalPred > 0 ? tp / totalPred : 0;
    const recall = totalTrue > 0 ? tp / totalTrue : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[className] = {
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      count: totalTrue,
    };
  }

  // Clean up tensors
  trainTensors.x.dispose();
  trainTensors.y.dispose();
  valTensors.x.dispose();
  valTensors.y.dispose();
  valPredsTensor.dispose();

  const metrics: ModelMetrics = {
    accuracy: Number(realValAccuracy.toFixed(3)),
    valAccuracy: Number(realValAccuracy.toFixed(3)),
    valLoss: Number(bestValLoss.toFixed(4)),
    confusionMatrix,
    perClass,
    labels: labelSet,
  };

  const modelId = Math.random().toString(36).substring(2, 9);
  const meta: TrainedModelMeta = {
    id: modelId,
    name: options.modelName.trim() || `SignModel_${new Date().toISOString().slice(0, 10)}`,
    kind: 'static_mlp',
    labels: labelSet,
    metrics,
    trainedAt: new Date().toISOString(),
    sampleCount: samples.length,
  };

  // Save to IndexedDB
  await saveModelToIndexedDb(modelId, model, meta);

  return {
    meta,
    metrics,
  };
}
