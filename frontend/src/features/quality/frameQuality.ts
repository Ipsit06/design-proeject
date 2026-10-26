import type { Point3D } from '../recognition/geometry.js';

export interface QualityIssue {
  id: string;
  type: 'lighting_dark' | 'lighting_bright' | 'backlit' | 'clipped' | 'too_far' | 'too_close';
  message: string;
  severity: 'warning' | 'error';
}

export interface FrameQualityResult {
  isAcceptable: boolean;
  issues: QualityIssue[];
  meanLuminance: number;
  backlightRatio?: number;
  handAreaRatio?: number;
}

// Offscreen reusable canvas for downsampled quality analysis
let offscreenCanvas: HTMLCanvasElement | null = null;

export function evaluateFrameQuality(
  video: HTMLVideoElement,
  landmarksList: Point3D[][]
): FrameQualityResult {
  const issues: QualityIssue[] = [];

  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return {
      isAcceptable: true,
      issues: [],
      meanLuminance: 128,
    };
  }

  // 1. Analyze Video Luminance via 64x48 thumbnail
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 64;
    offscreenCanvas.height = 48;
  }

  const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  let meanLuminance = 128;
  let backlightRatio: number | undefined;

  if (ctx) {
    try {
      ctx.drawImage(video, 0, 0, 64, 48);
      const imgData = ctx.getImageData(0, 0, 64, 48);
      const data = imgData.data;

      let totalLum = 0;
      const count = 64 * 48;

      for (let i = 0; i < data.length; i += 4) {
        // Standard Rec. 601 luma formula
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLum += lum;
      }

      meanLuminance = totalLum / count;

      if (meanLuminance < 45) {
        issues.push({
          id: 'lighting_dark',
          type: 'lighting_dark',
          message: 'Lighting is too dark. Increase ambient light.',
          severity: 'warning',
        });
      } else if (meanLuminance > 225) {
        issues.push({
          id: 'lighting_bright',
          type: 'lighting_bright',
          message: 'Lighting is washed out / overexposed.',
          severity: 'warning',
        });
      }

      // Check backlight if hand exists
      if (landmarksList.length > 0 && landmarksList[0].length >= 21) {
        const hand = landmarksList[0];
        // Calculate center of hand in 64x48 coords
        let hx = 0;
        let hy = 0;
        for (const p of hand) {
          hx += p.x;
          hy += p.y;
        }
        hx /= hand.length;
        hy /= hand.length;

        const thumbX = Math.floor(Math.max(0, Math.min(63, hx * 64)));
        const thumbY = Math.floor(Math.max(0, Math.min(47, hy * 48)));

        // Read sample near hand
        const handIndex = (thumbY * 64 + thumbX) * 4;
        const handLum =
          0.299 * data[handIndex] + 0.587 * data[handIndex + 1] + 0.114 * data[handIndex + 2];

        // Background vs hand luminance ratio
        if (handLum > 0) {
          backlightRatio = meanLuminance / Math.max(1, handLum);
          if (backlightRatio > 2.2 && meanLuminance > 120) {
            issues.push({
              id: 'backlit',
              type: 'backlit',
              message: 'Backlight detected. Move light source in front of you.',
              severity: 'warning',
            });
          }
        }
      }
    } catch {}
  }

  // 2. Analyze Hand Framing & Bounding Box
  let handAreaRatio: number | undefined;

  for (const hand of landmarksList) {
    if (hand.length < 21) continue;

    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (const p of hand) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    handAreaRatio = boxWidth * boxHeight;

    // Hand clipped by edge of frame
    if (minX < 0.04 || maxX > 0.96 || minY < 0.04 || maxY > 0.96) {
      if (!issues.some((iss) => iss.type === 'clipped')) {
        issues.push({
          id: 'clipped',
          type: 'clipped',
          message: 'Hand is clipped by frame edge. Move fully into camera view.',
          severity: 'warning',
        });
      }
    }

    // Hand too far away
    if (handAreaRatio < 0.02) {
      if (!issues.some((iss) => iss.type === 'too_far')) {
        issues.push({
          id: 'too_far',
          type: 'too_far',
          message: 'Hand is too far from camera. Move hand closer.',
          severity: 'warning',
        });
      }
    } else if (handAreaRatio > 0.75) {
      // Hand too close
      if (!issues.some((iss) => iss.type === 'too_close')) {
        issues.push({
          id: 'too_close',
          type: 'too_close',
          message: 'Hand is too close to camera. Move slightly back.',
          severity: 'warning',
        });
      }
    }
  }

  return {
    isAcceptable: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    meanLuminance,
    backlightRatio,
    handAreaRatio,
  };
}
