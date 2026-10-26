/**
 * Euclidean distance between two feature vectors of equal length
 */
export function vectorDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Resamples a sequence of frames to a target fixed length (e.g. 30 frames) via linear interpolation
 */
export function resampleSequence(sequence: number[][], targetLength = 30): number[][] {
  if (sequence.length === 0) return [];
  if (sequence.length === targetLength) return sequence;
  if (sequence.length === 1) {
    return Array.from({ length: targetLength }, () => [...sequence[0]]);
  }

  const resampled: number[][] = [];
  const srcLen = sequence.length;
  const vectorDim = sequence[0].length;

  for (let i = 0; i < targetLength; i++) {
    const t = (i / (targetLength - 1)) * (srcLen - 1);
    const low = Math.floor(t);
    const high = Math.min(low + 1, srcLen - 1);
    const alpha = t - low;

    const frame: number[] = new Array(vectorDim);
    for (let d = 0; d < vectorDim; d++) {
      frame[d] = sequence[low][d] * (1 - alpha) + sequence[high][d] * alpha;
    }
    resampled.push(frame);
  }

  return resampled;
}

/**
 * Computes Dynamic Time Warping (DTW) distance between two sequences of feature vectors.
 */
export function computeDtwDistance(seqA: number[][], seqB: number[][]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return Infinity;

  // Initialize DP cost matrix
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  );
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = vectorDistance(seqA[i - 1], seqB[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / Math.max(n, m);
}

export interface SequenceTemplate {
  label: string;
  sequence: number[][]; // normalized & resampled frames
}

export class DtwSequenceClassifier {
  private templates: SequenceTemplate[] = [];

  setTemplates(templates: SequenceTemplate[]) {
    this.templates = templates.map((t) => ({
      label: t.label,
      sequence: resampleSequence(t.sequence, 30),
    }));
  }

  classify(querySequence: number[][]): { label: string; confidence: number; distance: number } | null {
    if (this.templates.length === 0 || querySequence.length === 0) return null;

    const queryResampled = resampleSequence(querySequence, 30);
    let bestDist = Infinity;
    let bestLabel = '';

    for (const tmpl of this.templates) {
      const dist = computeDtwDistance(queryResampled, tmpl.sequence);
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = tmpl.label;
      }
    }

    // Convert distance to confidence (lower distance -> higher confidence)
    // Distances typically range 0.1 to 3.0
    const confidence = Math.max(0.1, Math.min(0.99, 1.0 / (1.0 + bestDist * 0.8)));

    return {
      label: bestLabel,
      confidence: Number(confidence.toFixed(3)),
      distance: Number(bestDist.toFixed(4)),
    };
  }
}
