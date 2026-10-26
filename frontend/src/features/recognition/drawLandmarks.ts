import type { Point3D } from './geometry.js';

/**
 * MediaPipe 21 Hand Landmarks connection pairs
 */
export const HAND_CONNECTIONS: [number, number][] = [
  // Wrist to Palm bases
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17],                              // Palm base connection
];

export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarksList: Point3D[][],
  handednessList: string[],
  width: number,
  height: number
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  for (let h = 0; h < landmarksList.length; h++) {
    const landmarks = landmarksList[h];
    const isPrimaryHand = h === 0;

    // Stroke colors: Forest green for primary hand, dark sage for secondary hand
    const strokeColor = isPrimaryHand ? '#28674F' : '#338163';
    const jointFill = isPrimaryHand ? '#FFFFFF' : '#E7F0E9';
    const accentFill = '#E7F0E9';

    // 1. Draw connection lines
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isPrimaryHand ? 3.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) continue;

      ctx.beginPath();
      // Mirror x coordinate because video is typically mirrored for user comfort
      ctx.moveTo((1 - start.x) * width, start.y * height);
      ctx.lineTo((1 - end.x) * width, end.y * height);
      ctx.stroke();
    }

    // 2. Draw landmarks joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = (1 - lm.x) * width;
      const y = lm.y * height;

      ctx.beginPath();
      const isKeyFingertip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
      const radius = isKeyFingertip ? 5.5 : 3.5;

      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isKeyFingertip ? accentFill : jointFill;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 3. Draw Hand label badge if available
    const wrist = landmarks[0];
    if (wrist) {
      const wx = (1 - wrist.x) * width;
      const wy = Math.min(height - 10, wrist.y * height + 20);
      const label = handednessList[h] ? `${handednessList[h]} Hand` : `Hand ${h + 1}`;

      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(36, 43, 38, 0.75)';
      ctx.fillRect(wx - 26, wy - 11, 52, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, wx, wy + 1);
    }
  }

  ctx.restore();
}
