import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { DEFAULT_GESTURES, DEFAULT_SETTINGS } from './seed.js';
import type {
  GestureMapping,
  AppSettings,
  HistoryRecord,
  Session,
  Sample,
  TrainedModelMeta,
  EvalRun,
} from '@signbridge/shared';

export type DatabaseEngine = 'better-sqlite3' | 'json-file-fallback';

export interface JsonDatabaseStructure {
  gestures: GestureMapping[];
  history: HistoryRecord[];
  settings: AppSettings;
  sessions: Session[];
  samples: Sample[];
  models: TrainedModelMeta[];
  evalRuns: EvalRun[];
}

export interface DatabaseContext {
  engine: DatabaseEngine;
  sqliteDb: any | null;
  jsonFilePath: string;
  readJson: () => JsonDatabaseStructure;
  writeJson: (data: JsonDatabaseStructure) => void;
  close: () => void;
}

let dbContext: DatabaseContext | null = null;

export function getDatabaseContext(): DatabaseContext {
  if (dbContext) {
    return dbContext;
  }

  const resolvedDbPath = path.resolve(process.cwd(), env.DB_PATH);
  const dataDir = path.dirname(resolvedDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonFilePath = path.join(dataDir, 'signbridge_store.json');

  const defaultJsonData: JsonDatabaseStructure = {
    gestures: [...DEFAULT_GESTURES],
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
    samples: [],
    models: [],
    evalRuns: [],
  };

  const readJson = (): JsonDatabaseStructure => {
    try {
      if (!fs.existsSync(jsonFilePath)) {
        fs.writeFileSync(jsonFilePath, JSON.stringify(defaultJsonData, null, 2), 'utf-8');
        return defaultJsonData;
      }
      const raw = fs.readFileSync(jsonFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as JsonDatabaseStructure;

      // Ensure v2 arrays exist
      if (!parsed.samples) parsed.samples = [];
      if (!parsed.models) parsed.models = [];
      if (!parsed.evalRuns) parsed.evalRuns = [];

      let modified = false;
      const existingCategories = new Set(parsed.gestures.map((g) => g.category.toLowerCase()));
      for (const defG of DEFAULT_GESTURES) {
        if (!existingCategories.has(defG.category.toLowerCase())) {
          parsed.gestures.push(defG);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(jsonFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
      }

      return parsed;
    } catch (err) {
      console.error('[DB] Failed to read JSON database, returning default fallback', err);
      return defaultJsonData;
    }
  };

  const writeJson = (data: JsonDatabaseStructure): void => {
    try {
      fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist JSON database', err);
    }
  };

  let sqliteDb: any = null;
  let engine: DatabaseEngine = 'json-file-fallback';

  try {
    const Database = require('better-sqlite3');
    sqliteDb = new Database(resolvedDbPath);
    sqliteDb.pragma('journal_mode = WAL');

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      sqliteDb.exec(schemaSql);
    }

    const gestureCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM gesture_mappings').get().count;
    if (gestureCount === 0) {
      const insertGesture = sqliteDb.prepare(
        'INSERT INTO gesture_mappings (category, text, status, type, enabled, description, language) VALUES (@category, @text, @status, @type, @enabled, @description, @language)'
      );
      for (const g of DEFAULT_GESTURES) {
        insertGesture.run({
          ...g,
          type: g.type || 'generic_gesture',
          language: g.language || 'Universal',
          enabled: g.enabled ? 1 : 0,
        });
      }
    }

    const settingsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM app_settings').get().count;
    if (settingsCount === 0) {
      sqliteDb.prepare(
        'INSERT INTO app_settings (id, speechEnabled, speechRate, confidenceThreshold, autoSpeak, recognitionMode, aiAssistanceEnabled, holdTimeMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        'main',
        DEFAULT_SETTINGS.speechEnabled ? 1 : 0,
        DEFAULT_SETTINGS.speechRate,
        DEFAULT_SETTINGS.confidenceThreshold,
        DEFAULT_SETTINGS.autoSpeak ? 1 : 0,
        DEFAULT_SETTINGS.recognitionMode || 'sign_language',
        DEFAULT_SETTINGS.aiAssistanceEnabled ? 1 : 0,
        DEFAULT_SETTINGS.holdTimeMs || 350
      );
    }

    engine = 'better-sqlite3';
  } catch (err) {
    engine = 'json-file-fallback';
    sqliteDb = null;

    if (!fs.existsSync(jsonFilePath)) {
      writeJson(defaultJsonData);
    } else {
      readJson();
    }
  }

  dbContext = {
    engine,
    sqliteDb,
    jsonFilePath,
    readJson,
    writeJson,
    close: () => {
      if (sqliteDb) {
        try {
          sqliteDb.close();
        } catch (e) {
          console.error('[DB] Error closing SQLite connection:', e);
        }
      }
    },
  };

  return dbContext;
}
