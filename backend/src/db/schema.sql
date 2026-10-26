CREATE TABLE IF NOT EXISTS gesture_mappings (
  category TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  language TEXT
);

CREATE TABLE IF NOT EXISTS history_records (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  score REAL,
  source TEXT NOT NULL,
  sessionId TEXT,
  tokens TEXT,
  recognitionModel TEXT,
  vocabularyId TEXT,
  aiAssisted INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  speechEnabled INTEGER NOT NULL DEFAULT 1,
  speechRate REAL NOT NULL DEFAULT 1.0,
  confidenceThreshold REAL NOT NULL DEFAULT 0.65,
  autoSpeak INTEGER NOT NULL DEFAULT 0,
  recognitionMode TEXT DEFAULT 'sign_language',
  aiAssistanceEnabled INTEGER DEFAULT 1,
  holdTimeMs INTEGER DEFAULT 350,
  numHands INTEGER DEFAULT 2,
  qualityGuidanceEnabled INTEGER DEFAULT 1,
  minHandDetectionConfidence REAL DEFAULT 0.5,
  minTrackingConfidence REAL DEFAULT 0.5,
  inPlaneRotationNormalization INTEGER DEFAULT 0,
  enableFaceCues INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  startedAt TEXT NOT NULL,
  endedAt TEXT,
  mode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  features TEXT NOT NULL,
  handsCount INTEGER NOT NULL DEFAULT 1,
  lighting TEXT,
  sessionId TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  labels TEXT NOT NULL,
  metrics TEXT NOT NULL,
  trainedAt TEXT NOT NULL,
  sampleCount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  modelId TEXT NOT NULL,
  condition TEXT NOT NULL,
  accuracy REAL NOT NULL,
  total INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_createdAt ON history_records (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_samples_label ON samples (label);
CREATE INDEX IF NOT EXISTS idx_samples_kind ON samples (kind);
CREATE INDEX IF NOT EXISTS idx_eval_runs_condition ON eval_runs (condition);
