import type { RecognitionAdapter, AdapterFrameInput, AdapterRecognitionResult } from './types.js';
import { analyzeHandGeometry, distance3D, angle3D, type HandGeometry, type Point3D } from '../geometry.js';

interface ClassifierCandidate {
  label: string;
  mappedText: string;
  confidence: number;
  notes: string;
}

export class AslSignLanguageAdapter implements RecognitionAdapter {
  id = 'asl_landmark_temporal';
  name = 'American Sign Language (ASL Landmark & Temporal)';
  mode: 'sign_language' = 'sign_language';
  vocabularyId = 'asl_lexicon';
  supportedLabels = [
    'ASL_A',
    'ASL_B',
    'ASL_C',
    'ASL_D',
    'ASL_I',
    'ASL_L',
    'ASL_O',
    'ASL_U',
    'ASL_V',
    'ASL_W',
    'ASL_Y',
    'ASL_HELLO',
    'ASL_THANK_YOU',
    'ASL_YES',
    'ASL_NO',
  ];

  processFrame(input: AdapterFrameInput): AdapterRecognitionResult | null {
    if (!input.landmarks || input.landmarks.length === 0 || input.landmarks[0].length < 21) {
      return null;
    }

    // Suppress detection during rapid hand transition movement
    if (input.velocity > 0.0018) {
      return null;
    }

    const primaryHand = input.landmarks[0];
    const geo = analyzeHandGeometry(primaryHand);
    if (!geo) return null;

    const candidates: ClassifierCandidate[] = [];

    // Test each validated ASL posture
    this.evaluateLetters(geo, primaryHand, candidates);
    this.evaluateConversationalSigns(geo, primaryHand, input, candidates);

    if (candidates.length === 0) {
      return null;
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    const top = candidates[0];

    // Strictly enforce confidence threshold
    if (top.confidence < input.confidenceThreshold) {
      return null;
    }

    return {
      label: top.label,
      mappedText: top.mappedText,
      confidence: Number(top.confidence.toFixed(3)),
      startTimestamp: input.timestamp,
      endTimestamp: input.timestamp,
      mode: 'sign_language',
      isGenericGesture: false,
      vocabularyId: this.vocabularyId,
      hand: (input.handedness[0] as 'Left' | 'Right') || 'Right',
      notes: top.notes,
    };
  }

  private evaluateLetters(geo: HandGeometry, points: Point3D[], out: ClassifierCandidate[]) {
    const { thumb, index, middle, ring, pinky } = geo;

    // --- ASL 'L': Index up, Thumb at 90 deg, others curled ---
    if (
      index.isExtended &&
      thumb.isExtended &&
      middle.isCurled &&
      ring.isCurled &&
      pinky.isCurled &&
      geo.thumbAbductionAngle > 45 &&
      geo.thumbAbductionAngle < 135
    ) {
      const angleDeviation = Math.abs(geo.thumbAbductionAngle - 85);
      const conf = Math.max(0.7, 0.98 - (angleDeviation / 90) * 0.25);
      out.push({
        label: 'ASL_L',
        mappedText: 'L',
        confidence: conf,
        notes: 'ASL Fingerspelling: Letter L (Index and thumb at right angle).',
      });
    }

    // --- ASL 'Y': Thumb and Pinky extended wide, middle 3 curled ---
    if (
      thumb.isExtended &&
      pinky.isExtended &&
      index.isCurled &&
      middle.isCurled &&
      ring.isCurled &&
      geo.thumbToPinkyTipDist > 1.2
    ) {
      const spread = Math.min(1.0, geo.thumbToPinkyTipDist / 1.5);
      out.push({
        label: 'ASL_Y',
        mappedText: 'Y',
        confidence: 0.85 + spread * 0.12,
        notes: 'ASL Fingerspelling: Letter Y (Thumb and pinky horns spread).',
      });
    }

    // --- ASL 'I': Only Pinky extended up, others curled in fist ---
    if (
      pinky.isExtended &&
      index.isCurled &&
      middle.isCurled &&
      ring.isCurled &&
      thumb.isCurled
    ) {
      out.push({
        label: 'ASL_I',
        mappedText: 'I',
        confidence: 0.92,
        notes: 'ASL Fingerspelling: Letter I (Pinky extended upright).',
      });
    }

    // --- ASL 'V': Index and Middle extended spread, ring & pinky curled ---
    if (
      index.isExtended &&
      middle.isExtended &&
      ring.isCurled &&
      pinky.isCurled &&
      geo.indexToMiddleTipDist > 0.35
    ) {
      out.push({
        label: 'ASL_V',
        mappedText: 'V',
        confidence: 0.93,
        notes: 'ASL Fingerspelling: Letter V (Index and middle spread in V).',
      });
    }

    // --- ASL 'U': Index and Middle extended TOUCHING, ring & pinky curled ---
    if (
      index.isExtended &&
      middle.isExtended &&
      ring.isCurled &&
      pinky.isCurled &&
      geo.indexToMiddleTipDist <= 0.3
    ) {
      out.push({
        label: 'ASL_U',
        mappedText: 'U',
        confidence: 0.91,
        notes: 'ASL Fingerspelling: Letter U (Index and middle together).',
      });
    }

    // --- ASL 'W': Index, Middle, Ring extended upright and spread ---
    if (
      index.isExtended &&
      middle.isExtended &&
      ring.isExtended &&
      pinky.isCurled
    ) {
      out.push({
        label: 'ASL_W',
        mappedText: 'W',
        confidence: 0.92,
        notes: 'ASL Fingerspelling: Letter W (Three upright fingers spread).',
      });
    }

    // --- ASL 'B': 4 fingers upright together, thumb curled flat across palm ---
    if (
      index.isExtended &&
      middle.isExtended &&
      ring.isExtended &&
      pinky.isExtended &&
      thumb.isCurled &&
      geo.indexToMiddleTipDist < 0.28 &&
      geo.middleToRingTipDist < 0.28
    ) {
      out.push({
        label: 'ASL_B',
        mappedText: 'B',
        confidence: 0.94,
        notes: 'ASL Fingerspelling: Letter B (Four fingers held flat and upright).',
      });
    }

    // --- ASL 'D': Index pointing straight up, thumb touching middle/ring/pinky ---
    if (
      index.isExtended &&
      middle.isCurled &&
      ring.isCurled &&
      pinky.isCurled &&
      geo.thumbToMiddleTipDist < 0.35
    ) {
      out.push({
        label: 'ASL_D',
        mappedText: 'D',
        confidence: 0.90,
        notes: 'ASL Fingerspelling: Letter D (Index upright, other fingers form loop with thumb).',
      });
    }

    // --- ASL 'A': Fist with thumb upright against outer side of index finger ---
    if (
      index.isCurled &&
      middle.isCurled &&
      ring.isCurled &&
      pinky.isCurled &&
      thumb.isExtended &&
      geo.thumbToIndexTipDist < 0.55 &&
      points[4].y < points[6].y // thumb tip higher than index PIP
    ) {
      out.push({
        label: 'ASL_A',
        mappedText: 'A',
        confidence: 0.91,
        notes: 'ASL Fingerspelling: Letter A (Fist with thumb along side).',
      });
    }

    // --- ASL 'C': All fingers curved in C-shape ---
    if (
      !index.isExtended && !index.isCurled &&
      !middle.isExtended && !middle.isCurled &&
      !ring.isExtended && !ring.isCurled &&
      geo.thumbToIndexTipDist > 0.4 && geo.thumbToIndexTipDist < 0.95
    ) {
      out.push({
        label: 'ASL_C',
        mappedText: 'C',
        confidence: 0.86,
        notes: 'ASL Fingerspelling: Letter C (Curved open C-profile).',
      });
    }

    // --- ASL 'O': All fingertips touch thumb tip forming O circle ---
    if (
      !index.isExtended &&
      !middle.isExtended &&
      geo.thumbToIndexTipDist < 0.25 &&
      geo.thumbToMiddleTipDist < 0.25
    ) {
      out.push({
        label: 'ASL_O',
        mappedText: 'O',
        confidence: 0.89,
        notes: 'ASL Fingerspelling: Letter O (Fingertips meet thumb in circle).',
      });
    }
  }

  private evaluateConversationalSigns(
    geo: HandGeometry,
    points: Point3D[],
    input: AdapterFrameInput,
    out: ClassifierCandidate[]
  ) {
    const wrist = points[0];

    // --- ASL 'HELLO': Open palm near upper half of frame (near head level) held flat ---
    if (
      geo.index.isExtended &&
      geo.middle.isExtended &&
      geo.ring.isExtended &&
      geo.pinky.isExtended &&
      wrist.y < 0.45 // hand elevated near head / face level
    ) {
      out.push({
        label: 'ASL_HELLO',
        mappedText: 'Hello',
        confidence: 0.92,
        notes: 'ASL Greeting Sign: Open flat hand in greeting position near head.',
      });
    }

    // --- ASL 'YES': Fist tilting or nodding down ---
    if (
      geo.index.isCurled &&
      geo.middle.isCurled &&
      geo.ring.isCurled &&
      geo.pinky.isCurled &&
      points[4].y < points[8].y // thumb up or across fist
    ) {
      // In stable hold or subtle vertical bob
      out.push({
        label: 'ASL_YES',
        mappedText: 'Yes',
        confidence: 0.88,
        notes: 'ASL Affirmation Sign: Fist held steady or nodding.',
      });
    }

    // --- ASL 'NO': Index and Middle snap down onto thumb tip ---
    if (
      geo.ring.isCurled &&
      geo.pinky.isCurled &&
      geo.thumbToIndexTipDist < 0.28 &&
      geo.thumbToMiddleTipDist < 0.28
    ) {
      out.push({
        label: 'ASL_NO',
        mappedText: 'No',
        confidence: 0.89,
        notes: 'ASL Negation Sign: Index and middle meeting thumb in snap closing.',
      });
    }

    // --- ASL 'THANK_YOU': Flat hand near chin / chest extending forward ---
    if (
      geo.index.isExtended &&
      geo.middle.isExtended &&
      geo.ring.isExtended &&
      geo.pinky.isExtended &&
      wrist.y >= 0.45 && wrist.y <= 0.75 // chest level
    ) {
      out.push({
        label: 'ASL_THANK_YOU',
        mappedText: 'Thank you',
        confidence: 0.87,
        notes: 'ASL Courtesy Sign: Flat hand extending outward from chest level.',
      });
    }
  }

  reset() {}
}
