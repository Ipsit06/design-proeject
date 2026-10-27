import { z } from 'zod';

export const createHistorySchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  text: z.string().trim().min(1, 'Text mapping is required'),
  score: z.number().min(0).max(1).nullable().optional().default(null),
  source: z.enum(['live', 'demo', 'experimental'], {
    errorMap: () => ({ message: "Source must be 'live', 'demo', or 'experimental'" }),
  }),
  sessionId: z.string().nullable().optional().default(null),
  tokens: z.array(z.string()).optional(),
  recognitionModel: z.string().optional(),
  vocabularyId: z.string().optional(),
  aiAssisted: z.boolean().optional(),
});

export const queryHistorySchema = z.object({
  q: z.string().optional(),
  source: z.enum(['all', 'live', 'demo', 'experimental']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const updateGestureSchema = z
  .object({
    text: z.string().trim().min(1, 'Text cannot be empty').optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => data.text !== undefined || data.enabled !== undefined, {
    message: 'At least one of text or enabled must be provided',
  });

export const updateSettingsSchema = z
  .object({
    speechEnabled: z.boolean().optional(),
    speechRate: z
      .number()
      .min(0.5, 'Speech rate must be at least 0.5')
      .max(2.0, 'Speech rate cannot exceed 2.0')
      .optional(),
    confidenceThreshold: z
      .number()
      .min(0.1, 'Confidence threshold must be at least 0.1')
      .max(0.95, 'Confidence threshold cannot exceed 0.95')
      .optional(),
    autoSpeak: z.boolean().optional(),
    recognitionMode: z
      .enum(['harshil_asl', 'harshil_hci', 'generic', 'sign_language', 'custom_static', 'custom_sequence'])
      .optional(),
    aiAssistanceEnabled: z.boolean().optional(),
    holdTimeMs: z.number().min(150).max(2000).optional(),
    numHands: z.union([z.literal(1), z.literal(2)]).optional(),
    qualityGuidanceEnabled: z.boolean().optional(),
    minHandDetectionConfidence: z.number().min(0.1).max(1.0).optional(),
    minTrackingConfidence: z.number().min(0.1).max(1.0).optional(),
    inPlaneRotationNormalization: z.boolean().optional(),
    enableFaceCues: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.speechEnabled !== undefined ||
      data.speechRate !== undefined ||
      data.confidenceThreshold !== undefined ||
      data.autoSpeak !== undefined ||
      data.recognitionMode !== undefined ||
      data.aiAssistanceEnabled !== undefined ||
      data.holdTimeMs !== undefined ||
      data.numHands !== undefined ||
      data.qualityGuidanceEnabled !== undefined ||
      data.minHandDetectionConfidence !== undefined ||
      data.minTrackingConfidence !== undefined ||
      data.inPlaneRotationNormalization !== undefined ||
      data.enableFaceCues !== undefined,
    {
      message: 'At least one setting parameter must be provided to update',
    }
  );

export const createSessionSchema = z.object({
  mode: z.enum(['live', 'demo', 'experimental']).default('live'),
});

export const updateSessionSchema = z.object({
  endedAt: z.string().datetime().optional(),
});

export const llmAssistSchema = z.object({
  tokens: z.array(z.string()).min(1, 'At least one token is required for assistance'),
  vocabularyId: z.string().optional(),
  mode: z
    .enum(['harshil_asl', 'harshil_hci', 'generic', 'sign_language', 'custom_static', 'custom_sequence'])
    .optional()
    .default('harshil_asl'),
  contextSentence: z.string().optional(),
});

const gestureFrameSchema = z.object({
  timestamp: z.number().finite(),
  landmarks: z.array(z.array(z.array(z.number().finite()).length(3)).length(21)).min(1).max(2),
  handedness: z.array(z.string()).max(2),
});

export const analyzeGestureSchema = z.object({
  frames: z.array(gestureFrameSchema).min(4).max(60),
  durationMs: z.number().finite().min(100).max(10000),
  handCount: z.number().int().min(1).max(2),
  averageConfidence: z.number().min(0).max(1).optional(),
  mode: z.enum(['generic', 'sign_language', 'custom_static', 'custom_sequence']).optional(),
});

export const analyzeSignSchema = z.object({
  imageData: z.string().regex(/^data:image\/(jpeg|png);base64,/, 'A JPEG or PNG data URL is required').max(2_500_000),
  landmarks: z.array(z.array(z.array(z.number().finite()).length(3)).length(21)).min(1).max(2).optional(),
});

// V2 Samples, Models, EvalRun Schemas
export const createSampleSchema = z.object({
  label: z.string().trim().min(1, 'Label cannot be empty'),
  kind: z.enum(['static', 'sequence']),
  features: z.union([
    z.array(z.number()), // static feature vector
    z.array(z.array(z.number())), // sequence of vectors
  ]),
  handsCount: z.number().int().min(1).max(2).default(1),
  lighting: z.enum(['normal', 'low_light', 'backlit']).nullable().optional().default('normal'),
  sessionId: z.string().optional(),
  session: z.string().optional(),
  source: z.string().optional(),
  origin: z.string().optional(),
});

export const bulkSamplesSchema = z.object({
  samples: z.array(createSampleSchema).min(1, 'At least one sample is required'),
});

export const createModelSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Model name is required'),
  kind: z.enum(['static_mlp', 'sequence_rnn', 'dtw_template']),
  labels: z.array(z.string()).min(2, 'Model must have at least 2 distinct classes'),
  metrics: z.object({
    accuracy: z.number().min(0).max(1),
    loss: z.number().optional(),
    valAccuracy: z.number().min(0).max(1).optional(),
    valLoss: z.number().optional(),
    perClass: z.record(z.any()).optional(),
    confusionMatrix: z.array(z.array(z.number())).optional(),
    labels: z.array(z.string()).optional(),
  }),
  sampleCount: z.number().int().min(1),
});

export const createEvalRunSchema = z.object({
  modelId: z.string().min(1, 'modelId is required'),
  condition: z.enum(['normal', 'low_light', 'backlit', 'angle', 'occluded']),
  accuracy: z.number().min(0).max(1),
  total: z.number().int().min(1),
});
