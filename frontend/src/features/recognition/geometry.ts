export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes 3D Euclidean distance between two points.
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Computes the angle in degrees formed by three points (p1 - p2 - p3) with p2 as the vertex.
 */
export function angle3D(p1: Point3D, p2: Point3D, p3: Point3D): number {
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: (p1.z || 0) - (p2.z || 0),
  };
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: (p3.z || 0) - (p2.z || 0),
  };

  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const cosine = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/**
 * Computes hand scale factor based on wrist to middle MCP joint distance.
 */
export function getHandScale(landmarks: Point3D[]): number {
  const wrist = landmarks[0];
  const middleMCP = landmarks[9];
  if (!wrist || !middleMCP) return 1.0;
  const dist = distance3D(wrist, middleMCP);
  return Math.max(dist, 0.001);
}

/**
 * Analyzes whether a finger is extended or curled based on joint angles and relative tip-to-MCP elevation.
 * Landmarks indices:
 * Wrist: 0
 * Thumb:  CMC 1, MCP 2, IP 3, TIP 4
 * Index:  MCP 5, PIP 6, DIP 7, TIP 8
 * Middle: MCP 9, PIP 10, DIP 11, TIP 12
 * Ring:   MCP 13, PIP 14, DIP 15, TIP 16
 * Pinky:  MCP 17, PIP 18, DIP 19, TIP 20
 */
export interface FingerAnalysis {
  isExtended: boolean;
  isCurled: boolean;
  tipToMcpDist: number; // normalized
  jointAngle: number; // in degrees
}

export interface HandGeometry {
  scale: number;
  thumb: FingerAnalysis;
  index: FingerAnalysis;
  middle: FingerAnalysis;
  ring: FingerAnalysis;
  pinky: FingerAnalysis;
  // Inter-finger distances (normalized by hand scale)
  indexToMiddleTipDist: number;
  middleToRingTipDist: number;
  ringToPinkyTipDist: number;
  thumbToIndexTipDist: number;
  thumbToMiddleTipDist: number;
  thumbToPinkyTipDist: number;
  // Thumb abduction angle (between wrist-thumbMCP and wrist-indexMCP)
  thumbAbductionAngle: number;
}

export function analyzeHandGeometry(landmarks: Point3D[]): HandGeometry | null {
  if (!landmarks || landmarks.length < 21) return null;

  const scale = getHandScale(landmarks);
  const wrist = landmarks[0];

  // Helper to normalize distance by scale
  const normDist = (p1: Point3D, p2: Point3D) => distance3D(p1, p2) / scale;

  // Analyze Index (5, 6, 8)
  const indexAngle = angle3D(landmarks[5], landmarks[6], landmarks[8]);
  const indexDist = normDist(landmarks[8], landmarks[5]);
  const indexExtended = indexAngle > 140 && indexDist > 0.8;
  const indexCurled = indexAngle < 110 || indexDist < 0.55;

  // Analyze Middle (9, 10, 12)
  const middleAngle = angle3D(landmarks[9], landmarks[10], landmarks[12]);
  const middleDist = normDist(landmarks[12], landmarks[9]);
  const middleExtended = middleAngle > 140 && middleDist > 0.8;
  const middleCurled = middleAngle < 110 || middleDist < 0.55;

  // Analyze Ring (13, 14, 16)
  const ringAngle = angle3D(landmarks[13], landmarks[14], landmarks[16]);
  const ringDist = normDist(landmarks[16], landmarks[13]);
  const ringExtended = ringAngle > 140 && ringDist > 0.8;
  const ringCurled = ringAngle < 110 || ringDist < 0.55;

  // Analyze Pinky (17, 18, 20)
  const pinkyAngle = angle3D(landmarks[17], landmarks[18], landmarks[20]);
  const pinkyDist = normDist(landmarks[20], landmarks[17]);
  const pinkyExtended = pinkyAngle > 140 && pinkyDist > 0.75;
  const pinkyCurled = pinkyAngle < 110 || pinkyDist < 0.55;

  // Analyze Thumb (2, 3, 4)
  const thumbAngle = angle3D(landmarks[2], landmarks[3], landmarks[4]);
  const thumbDist = normDist(landmarks[4], landmarks[2]);
  const thumbExtended = thumbAngle > 135 && thumbDist > 0.6;
  const thumbCurled = thumbAngle < 120 || thumbDist < 0.5;

  const thumbAbductionAngle = angle3D(landmarks[4], wrist, landmarks[5]);

  return {
    scale,
    thumb: {
      isExtended: thumbExtended,
      isCurled: thumbCurled,
      tipToMcpDist: thumbDist,
      jointAngle: thumbAngle,
    },
    index: {
      isExtended: indexExtended,
      isCurled: indexCurled,
      tipToMcpDist: indexDist,
      jointAngle: indexAngle,
    },
    middle: {
      isExtended: middleExtended,
      isCurled: middleCurled,
      tipToMcpDist: middleDist,
      jointAngle: middleAngle,
    },
    ring: {
      isExtended: ringExtended,
      isCurled: ringCurled,
      tipToMcpDist: ringDist,
      jointAngle: ringAngle,
    },
    pinky: {
      isExtended: pinkyExtended,
      isCurled: pinkyCurled,
      tipToMcpDist: pinkyDist,
      jointAngle: pinkyAngle,
    },
    indexToMiddleTipDist: normDist(landmarks[8], landmarks[12]),
    middleToRingTipDist: normDist(landmarks[12], landmarks[16]),
    ringToPinkyTipDist: normDist(landmarks[16], landmarks[20]),
    thumbToIndexTipDist: normDist(landmarks[4], landmarks[8]),
    thumbToMiddleTipDist: normDist(landmarks[4], landmarks[12]),
    thumbToPinkyTipDist: normDist(landmarks[4], landmarks[20]),
    thumbAbductionAngle,
  };
}
