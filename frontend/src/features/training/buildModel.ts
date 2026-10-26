import * as tf from '@tensorflow/tfjs';
import { FEATURE_VECTOR_LENGTH } from '../landmarks/extractFeatures.js';

export function buildStaticMlpModel(numClasses: number, inputDim: number = FEATURE_VECTOR_LENGTH): tf.LayersModel {
  const model = tf.sequential();

  // Hidden Layer 1
  model.add(
    tf.layers.dense({
      inputShape: [inputDim],
      units: 96,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }),
    })
  );
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Hidden Layer 2
  model.add(
    tf.layers.dense({
      units: 48,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }),
    })
  );
  model.add(tf.layers.dropout({ rate: 0.15 }));

  // Output Layer
  model.add(
    tf.layers.dense({
      units: numClasses,
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

export function buildSequenceCnnModel(sequenceLength = 30, numClasses: number): tf.LayersModel {
  const model = tf.sequential();

  // 1D Convolution over temporal window
  model.add(
    tf.layers.conv1d({
      inputShape: [sequenceLength, FEATURE_VECTOR_LENGTH],
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
    })
  );
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Conv Layer 2
  model.add(
    tf.layers.conv1d({
      filters: 48,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
    })
  );
  model.add(tf.layers.globalAveragePooling1d({}));
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Dense Output
  model.add(
    tf.layers.dense({
      units: numClasses,
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}
