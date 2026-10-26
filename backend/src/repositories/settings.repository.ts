import { getDatabaseContext } from '../db/connection.js';
import { DEFAULT_SETTINGS } from '../db/seed.js';
import type { ISettingsRepository } from './types.js';
import type { AppSettings } from '@signbridge/shared';

export class SettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT speechEnabled, speechRate, confidenceThreshold, autoSpeak FROM app_settings WHERE id = ?').get('main');
      if (row) {
        return {
          speechEnabled: Boolean(row.speechEnabled),
          speechRate: Number(row.speechRate),
          confidenceThreshold: Number(row.confidenceThreshold),
          autoSpeak: Boolean(row.autoSpeak),
        };
      }
      return DEFAULT_SETTINGS;
    }

    const store = ctx.readJson();
    return store.settings || DEFAULT_SETTINGS;
  }

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated: AppSettings = {
      speechEnabled: settings.speechEnabled !== undefined ? settings.speechEnabled : current.speechEnabled,
      speechRate: settings.speechRate !== undefined ? settings.speechRate : current.speechRate,
      confidenceThreshold: settings.confidenceThreshold !== undefined ? settings.confidenceThreshold : current.confidenceThreshold,
      autoSpeak: settings.autoSpeak !== undefined ? settings.autoSpeak : current.autoSpeak,
    };

    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare(
        `INSERT INTO app_settings (id, speechEnabled, speechRate, confidenceThreshold, autoSpeak)
         VALUES ('main', @speechEnabled, @speechRate, @confidenceThreshold, @autoSpeak)
         ON CONFLICT(id) DO UPDATE SET
           speechEnabled = excluded.speechEnabled,
           speechRate = excluded.speechRate,
           confidenceThreshold = excluded.confidenceThreshold,
           autoSpeak = excluded.autoSpeak`
      ).run({
        speechEnabled: updated.speechEnabled ? 1 : 0,
        speechRate: updated.speechRate,
        confidenceThreshold: updated.confidenceThreshold,
        autoSpeak: updated.autoSpeak ? 1 : 0,
      });

      return updated;
    }

    const store = ctx.readJson();
    store.settings = updated;
    ctx.writeJson(store);
    return updated;
  }
}
