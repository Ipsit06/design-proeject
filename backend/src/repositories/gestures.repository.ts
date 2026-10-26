import { getDatabaseContext } from '../db/connection.js';
import type { IGesturesRepository } from './types.js';
import type { GestureMapping } from '@signbridge/shared';

export class GesturesRepository implements IGesturesRepository {
  async findAll(): Promise<GestureMapping[]> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const rows = ctx.sqliteDb.prepare('SELECT category, text, status, enabled, description FROM gesture_mappings').all();
      return rows.map((r: any) => ({
        ...r,
        enabled: Boolean(r.enabled),
      }));
    }

    const store = ctx.readJson();
    return store.gestures;
  }

  async findByCategory(category: string): Promise<GestureMapping | null> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT category, text, status, enabled, description FROM gesture_mappings WHERE category = ?').get(category);
      if (!row) return null;
      return {
        ...row,
        enabled: Boolean(row.enabled),
      };
    }

    const store = ctx.readJson();
    return store.gestures.find((g) => g.category.toLowerCase() === category.toLowerCase()) || null;
  }

  async update(
    category: string,
    data: { text?: string; enabled?: boolean }
  ): Promise<GestureMapping | null> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const existing = await this.findByCategory(category);
      if (!existing) return null;

      const newText = data.text !== undefined ? data.text : existing.text;
      const newEnabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);

      ctx.sqliteDb.prepare(
        'UPDATE gesture_mappings SET text = ?, enabled = ? WHERE category = ?'
      ).run(newText, newEnabled, existing.category);

      return this.findByCategory(existing.category);
    }

    const store = ctx.readJson();
    const index = store.gestures.findIndex(
      (g) => g.category.toLowerCase() === category.toLowerCase()
    );
    if (index === -1) return null;

    if (data.text !== undefined) {
      store.gestures[index].text = data.text;
    }
    if (data.enabled !== undefined) {
      store.gestures[index].enabled = data.enabled;
    }

    ctx.writeJson(store);
    return store.gestures[index];
  }
}
