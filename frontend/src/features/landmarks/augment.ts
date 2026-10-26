import { FEATURE_VECTOR_LENGTH } from './extractFeatures.js';

export interface AugmentOptions {
  jitterStd?: number;
  rotationMaxDeg?: number;
  scaleRange?: [number, number];
  dropoutProb?: number;
  mirror?: boolean;
}

/**
 * Augments a 131-dimension static feature vector for model training:
 * - Gaussian jitter
 * - Random 2D in-plane rotation
 * - Random scaling
 * - Landmark dropout (occlusion simulation)
 * - Optional left/right hand mirroring
 */
export function augmentFeatureVector(
  features: number[],
  options: AugmentOptions = {}
): number[] {
  const is63 = features.length === 63;
  const is131 = features.length === FEATURE_VECTOR_LENGTH;
  if (!is63 && !is131) {
    return [...features];
  }

  const jitterStd = options.jitterStd ?? 0.012;
  const rotationDeg = options.rotationMaxDeg
    ? (Math.random() * 2 - 1) * options.rotationMaxDeg
    : (Math.random() * 2 - 1) * 8; // +/- 8 degrees default
  const scale = options.scaleRange
    ? options.scaleRange[0] + Math.random() * (options.scaleRange[1] - options.scaleRange[0])
    : 0.95 + Math.random() * 0.1; // 0.95 to 1.05
  const dropoutProb = options.dropoutProb ?? 0.05;

  const rad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const augmented = new Array(features.length).fill(0);

  // Helper to transform hand slot coordinates
  const transformHand = (srcOffset: number, dstOffset: number) => {
    for (let i = 0; i < 21; i++) {
      let x = features[srcOffset + i * 3 + 0];
      let y = features[srcOffset + i * 3 + 1];
      let z = features[srcOffset + i * 3 + 2];

      // Simulated occlusion / dropout on fingertips (4, 8, 12, 16, 20)
      if (Math.random() < dropoutProb && (i === 4 || i === 8 || i === 12 || i === 16 || i === 20)) {
        x = 0;
        y = 0;
        z = 0;
      } else {
        // Apply rotation in XY
        const rx = x * cosR - y * sinR;
        const ry = x * sinR + y * cosR;

        // Apply scale & Gaussian jitter
        const jx = (Math.random() + Math.random() - 1) * jitterStd;
        const jy = (Math.random() + Math.random() - 1) * jitterStd;
        const jz = (Math.random() + Math.random() - 1) * jitterStd;

        x = rx * scale + jx;
        y = ry * scale + jy;
        z = z * scale + jz;
      }

      augmented[dstOffset + i * 3 + 0] = Number(x.toFixed(4));
      augmented[dstOffset + i * 3 + 1] = Number(y.toFixed(4));
      augmented[dstOffset + i * 3 + 2] = Number(z.toFixed(4));
    }
  };

  if (is63) {
    transformHand(0, 0);
    return augmented;
  }

  if (options.mirror) {
    // Swap left and right slots when mirroring
    transformHand(0, 63); // left -> right
    transformHand(63, 0); // right -> left
    augmented[126] = features[127]; // left present = right present
    augmented[127] = features[126]; // right present = left present
    augmented[128] = features[128]; // wrist dist
    augmented[129] = features[129]; // index tip dist
    augmented[130] = -features[130]; // inverted relative height
  } else {
    transformHand(0, 0); // left -> left
    transformHand(63, 63); // right -> right
    augmented[126] = features[126];
    augmented[127] = features[127];
    augmented[128] = features[128];
    augmented[129] = features[129];
    augmented[130] = features[130];
  }

  return augmented;
}
