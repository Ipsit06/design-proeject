export type HistorySource = 'live' | 'demo' | 'experimental';

export type RecognitionMode =
  | 'generic'
  | 'sign_language'
  | 'custom_static'
  | 'custom_sequence'
  | 'sanket_video';

export type GestureCategoryType =
  | 'generic_gesture'
  | 'asl_letter'
  | 'asl_word'
  | 'custom_unvalidated'
  | 'experimental'
  | 'planned';

export type GestureStatus =
  | 'implemented_tested'
  | 'model_available_unverified'
  | 'custom_unvalidated'
  | 'planned';

export interface HistoryRecord {
  id: string; // UUID
  category: string;
  text: string;
  score: number | null;
  source: HistorySource;
  sessionId: string | null;
  createdAt: string; // ISO 8601 string
  // Enhanced recognition metadata
  tokens?: string[];
  recognitionModel?: string; // e.g. 'asl_landmark_geometry' | 'mediapipe_generic' | 'custom_static_mlp' | 'custom_sequence_dtw'
  vocabularyId?: string;
  aiAssisted?: boolean;
}

export interface GestureMapping {
  category: string; // Primary key
  text: string;
  status: GestureStatus;
  type?: GestureCategoryType;
  enabled: boolean;
  description: string;
  language?: string; // e.g. 'ASL' | 'ISL' | 'Universal' | 'Custom'
}

export interface AppSettings {
  speechEnabled: boolean;
  speechRate: number; // 0.5 - 2.0
  confidenceThreshold: number; // 0.1 - 0.95
  autoSpeak?: boolean;
  recognitionMode?: RecognitionMode;
  aiAssistanceEnabled?: boolean;
  holdTimeMs?: number;
  // v2 New Environmental & Pipeline Settings
  numHands?: 1 | 2;
  qualityGuidanceEnabled?: boolean;
  minHandDetectionConfidence?: number;
  minTrackingConfidence?: number;
  inPlaneRotationNormalization?: boolean;
  enableFaceCues?: boolean;
}

export type SessionMode = 'live' | 'demo' | 'experimental';

export interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  mode: SessionMode;
}

export interface DashboardStats {
  totalSaved: number;
  distinctCategories: number;
  completedSessions: number;
  recentActivity: number; // records created in the last 7 days
  signLanguageCount?: number;
  genericGestureCount?: number;
  // v2 New stats
  samplesCount?: number;
  samplesPerLabel?: Record<string, number>;
  modelsCount?: number;
  bestValAccuracy?: number | null;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface HistoryListResponse {
  items: HistoryRecord[];
  total: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  version: string;
  database: 'connected' | 'disconnected';
  engine: 'better-sqlite3' | 'json-file-fallback';
  sanketConfigured: boolean;
}

// Legacy language assistance types retained for stored API compatibility.
export interface LlmAssistRequest {
  tokens: string[];
  vocabularyId?: string;
  mode?: RecognitionMode;
  contextSentence?: string;
}

export interface LlmAssistResponse {
  sentence: string;
  rawTokens: string[];
  assisted: boolean;
  provider: 'gemini' | 'huggingface' | 'local_heuristic';
  explanation?: string;
  script?: string;
}

export type GestureAnalysisStatus = 'recognized' | 'uncertain' | 'unsupported';

export interface GestureAnalysisFrame {
  timestamp: number;
  landmarks: number[][][];
  handedness: string[];
}

export interface GestureAnalysisRequest {
  frames: GestureAnalysisFrame[];
  durationMs: number;
  handCount: number;
  averageConfidence?: number;
  mode?: RecognitionMode;
}

export interface GestureAnalysisResponse {
  status: GestureAnalysisStatus;
  observed_motion: string;
  possible_sign: string | null;
  language: 'ISL';
  meaning_en: string | null;
  sentence_en: string | null;
  spoken_text: string;
  confidence: number;
  needs_clarification: boolean;
  clarification_question: string | null;
  limitations: string[];
  provider: 'gemini' | 'local_heuristic';
}

export interface SignVisionResponse {
  status: 'recognized' | 'uncertain' | 'unsupported';
  sign: string | null;
  meaning_en: string | null;
  confidence: number;
  explanation: string;
  limitations: string[];
  provider: 'gemini' | 'unavailable';
}

// Recognition Result from Model Adapters
export interface SignRecognitionResult {
  recognizedLabel: string;
  mappedText: string;
  confidence: number | null;
  startTimestamp?: number;
  endTimestamp?: number;
  mode: RecognitionMode;
  isGenericGesture: boolean;
  vocabularyId: string;
  hand?: 'Left' | 'Right' | 'Both';
}

// ==========================================
// V2 SPECIFICATIONS: SAMPLES, MODELS, EVAL
// ==========================================

export type SampleKind = 'static' | 'sequence';
export type LightingCondition = 'normal' | 'low_light' | 'backlit';
export type EvalCondition = 'normal' | 'low_light' | 'backlit' | 'angle' | 'occluded';

export interface Sample {
  id: string; // UUID
  label: string;
  kind: SampleKind;
  features: number[] | number[][]; // flattened vector for static, array of vectors for sequence
  handsCount: number; // 1 or 2
  lighting?: LightingCondition;
  sessionId?: string;
  createdAt: string;
}

export interface SamplesListResponse {
  items: Sample[];
  total: number;
  countsPerLabel: Record<string, number>;
  countsPerKind: Record<SampleKind, number>;
}

export interface ModelMetrics {
  accuracy: number;
  loss?: number;
  valAccuracy?: number;
  valLoss?: number;
  perClass?: Record<string, { precision: number; recall: number; f1: number; count: number }>;
  confusionMatrix?: number[][];
  labels?: string[];
}

export interface TrainedModelMeta {
  id: string; // UUID
  name: string;
  kind: 'static_mlp' | 'sequence_rnn' | 'dtw_template';
  labels: string[];
  metrics: ModelMetrics;
  trainedAt: string;
  sampleCount: number;
}

export interface EvalRun {
  id: string; // UUID
  modelId: string;
  condition: EvalCondition;
  accuracy: number;
  total: number;
  createdAt: string;
}

export interface EvalRunsResponse {
  runs: EvalRun[];
  byCondition: Record<EvalCondition, { averageAccuracy: number; totalRuns: number; totalSamples: number }>;
}
