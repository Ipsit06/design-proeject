export interface ModelLayer {
  weights: number[][]; // [inputDim, outputDim]
  bias: number[];      // [outputDim]
  activation: 'relu' | 'softmax';
}

export interface ModelDefinition {
  model: string;
  labels: string[];
  layers: ModelLayer[];
}

export const ASL_LABELS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const HCI_LABELS = [
  'open_palm',
  'fist',
  'two_fingers',
  'pointing',
  'thumbs_up',
  'thumbs_down',
  'victory',
  'ok_sign',
  'pinch'
];

let aslModelCache: ModelDefinition | null = null;
let hciModelCache: ModelDefinition | null = null;
let loadPromise: Promise<[ModelDefinition, ModelDefinition]> | null = null;

export function isAslReady(): boolean {
  return aslModelCache !== null;
}

export function isHciReady(): boolean {
  return hciModelCache !== null;
}

/**
 * Loads Harshil's trained neural network weights from public static assets.
 */
export async function loadHarshilModels(): Promise<[ModelDefinition, ModelDefinition]> {
  if (aslModelCache && hciModelCache) {
    return [aslModelCache, hciModelCache];
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const [aslRes, hciRes] = await Promise.all([
        fetch('/models/asl_model_weights.json'),
        fetch('/models/gesture_model_weights.json'),
      ]);

      if (!aslRes.ok || !hciRes.ok) {
        throw new Error(`Failed to load Harshil model weights: ${aslRes.status} / ${hciRes.status}`);
      }

      aslModelCache = (await aslRes.json()) as ModelDefinition;
      hciModelCache = (await hciRes.json()) as ModelDefinition;

      return [aslModelCache, hciModelCache];
    } catch (err) {
      console.error('[HarshilEngine] Error loading model weights:', err);
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

// Auto-trigger loading in browser environments
if (typeof window !== 'undefined') {
  loadHarshilModels().catch((e) => {
    console.warn('[HarshilEngine] Auto-load scheduled retry on first interaction:', e);
  });
}

export interface HarshilPrediction {
  label: string;
  confidence: number;
  allScores: Record<string, number>;
  rawVector: number[];
}

/**
 * Extracts 63 normalized landmark features exactly as defined in harshil585/Hand_Gestures:
 * 1. Takes 21 (x, y, z) landmarks
 * 2. Translates wrist (joint 0) to origin: lm -= wrist
 * 3. Divides all coordinates by max absolute value: max_val = np.max(np.abs(lm)); lm /= max_val
 * 4. Returns flat 63-element array
 */
export function extractHarshilFeatures(
  landmarks: Array<{ x: number; y: number; z?: number }>
): number[] {
  if (!landmarks || landmarks.length < 21) {
    return new Array(63).fill(0);
  }

  const wrist = landmarks[0];
  const wx = wrist.x;
  const wy = wrist.y;
  const wz = wrist.z || 0;

  const rel: Array<[number, number, number]> = [];
  let maxVal = 0;

  for (let i = 0; i < 21; i++) {
    const rx = landmarks[i].x - wx;
    const ry = landmarks[i].y - wy;
    const rz = (landmarks[i].z || 0) - wz;
    rel.push([rx, ry, rz]);

    const absX = Math.abs(rx);
    const absY = Math.abs(ry);
    const absZ = Math.abs(rz);
    if (absX > maxVal) maxVal = absX;
    if (absY > maxVal) maxVal = absY;
    if (absZ > maxVal) maxVal = absZ;
  }

  const scale = maxVal > 1e-7 ? maxVal : 1;
  const feat = new Array(63);
  for (let i = 0; i < 21; i++) {
    feat[i * 3 + 0] = Number((rel[i][0] / scale).toFixed(6));
    feat[i * 3 + 1] = Number((rel[i][1] / scale).toFixed(6));
    feat[i * 3 + 2] = Number((rel[i][2] / scale).toFixed(6));
  }

  return feat;
}

/**
 * Forward pass through dense feedforward layers
 */
function forwardPass(x: number[], layers: ModelLayer[]): number[] {
  let cur = x;

  for (const layer of layers) {
    const { weights, bias, activation } = layer;
    const inDim = cur.length;
    const outDim = bias.length;
    const out = new Array(outDim);

    for (let j = 0; j < outDim; j++) {
      let sum = bias[j];
      for (let i = 0; i < inDim; i++) {
        sum += cur[i] * weights[i][j];
      }
      out[j] = activation === 'relu' ? Math.max(0, sum) : sum;
    }

    if (activation === 'softmax') {
      let maxVal = -Infinity;
      for (let j = 0; j < outDim; j++) {
        if (out[j] > maxVal) maxVal = out[j];
      }
      let expSum = 0;
      for (let j = 0; j < outDim; j++) {
        out[j] = Math.exp(out[j] - maxVal);
        expSum += out[j];
      }
      const invSum = expSum > 0 ? 1 / expSum : 1;
      for (let j = 0; j < outDim; j++) {
        out[j] *= invSum;
      }
    }

    cur = out;
  }

  return cur;
}

/**
 * Predicts ASL letter (A-Z) using Harshil's trained asl_model weights
 */
export function predictAslLetter(
  landmarks: Array<{ x: number; y: number; z?: number }>
): HarshilPrediction | null {
  if (!aslModelCache) {
    return null;
  }

  const feat = extractHarshilFeatures(landmarks);
  const probs = forwardPass(feat, aslModelCache.layers);

  let topIdx = 0;
  let topProb = -1;
  const allScores: Record<string, number> = {};

  for (let i = 0; i < aslModelCache.labels.length; i++) {
    const label = aslModelCache.labels[i];
    const p = probs[i];
    allScores[label] = Number(p.toFixed(4));
    if (p > topProb) {
      topProb = p;
      topIdx = i;
    }
  }

  return {
    label: aslModelCache.labels[topIdx] || 'A',
    confidence: Number(topProb.toFixed(4)),
    allScores,
    rawVector: feat,
  };
}

/**
 * Predicts HCI gesture using Harshil's trained gesture_model weights
 * Labels: ["open_palm", "fist", "two_fingers", "pointing", "thumbs_up", "thumbs_down", "victory", "ok_sign", "pinch"]
 */
export function predictHciGesture(
  landmarks: Array<{ x: number; y: number; z?: number }>
): HarshilPrediction | null {
  if (!hciModelCache) {
    return null;
  }

  const feat = extractHarshilFeatures(landmarks);
  const probs = forwardPass(feat, hciModelCache.layers);

  let topIdx = 0;
  let topProb = -1;
  const allScores: Record<string, number> = {};

  for (let i = 0; i < hciModelCache.labels.length; i++) {
    const label = hciModelCache.labels[i];
    const p = probs[i];
    allScores[label] = Number(p.toFixed(4));
    if (p > topProb) {
      topProb = p;
      topIdx = i;
    }
  }

  return {
    label: hciModelCache.labels[topIdx] || 'fist',
    confidence: Number(topProb.toFixed(4)),
    allScores,
    rawVector: feat,
  };
}
