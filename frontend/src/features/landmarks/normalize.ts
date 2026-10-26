import type { Point3D } from '../recognition/geometry.js';
import { distance3D } from '../recognition/geometry.js';

export interface NormalizationOptions {
  enableInPlaneRotation?: boolean;
}

/**
 * Normalizes 21 3D hand landmarks:
 * 1. Translation invariance: Subtracts wrist (landmark 0) from all points.
 * 2. Scale invariance: Divides all coordinates by distance from wrist to middle MCP (landmark 9).
 * 3. Optional in-plane rotation: Rotates in the XY plane so the wrist-to-middleMCP vector aligns with the Y axis.
 */
export function normalizeHandLandmarks(
  landmarks: Point3D[],
  options: NormalizationOptions = {}
): Point3D[] {
  if (!landmarks || landmarks.length < 21) {
    return new Array(21).fill({ x: 0, y: 0, z: 0 });
  }

  const wrist = landmarks[0];
  const middleMCP = landmarks[9];

  // 1. Calculate scale factor (distance from wrist to middle MCP)
  const rawScale = distance3D(wrist, middleMCP);
  const scale = Math.max(rawScale, 0.001);

  // 2. Translate to wrist origin and scale
  const translated = landmarks.map((p) => ({
    x: (p.x - wrist.x) / scale,
    y: (p.y - wrist.y) / scale,
    z: ((p.z || 0) - (wrist.z || 0)) / scale,
  }));

  // 3. Optional in-plane rotation normalization
  if (options.enableInPlaneRotation) {
    const p9 = translated[9];
    // Angle of vector from wrist (0,0) to middle MCP
    const currentAngle = Math.atan2(p9.y, p9.x);
    // Target upright vertical angle: -PI/2 (pointing up in screen coords where Y increases down)
    const targetAngle = -Math.PI / 2;
    const rotationAngle = targetAngle - currentAngle;

    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);

    return translated.map((p) => ({
      x: p.x * cosR - p.y * sinR,
      y: p.x * sinR + p.y * cosR,
      z: p.z,
    }));
  }

  return translated;
}
