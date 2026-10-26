import { getDatabaseContext } from '../db/connection.js';
import type { IHistoryRepository, HistoryFilterParams } from './types.js';
import type { HistoryRecord } from '@signbridge/shared';

export class HistoryRepository implements IHistoryRepository {
  async findMany(params: HistoryFilterParams): Promise<{ items: HistoryRecord[]; total: number }> {
    const ctx = getDatabaseContext();
    const limit = Math.max(1, Math.min(params.limit ?? 20, 100));
    const offset = Math.max(0, params.offset ?? 0);
    const q = params.q?.trim().toLowerCase() || '';
    const source = params.source;

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const conditions: string[] = [];
      const sqlParams: any = {};

      if (q) {
        conditions.push('(LOWER(category) LIKE @search OR LOWER(text) LIKE @search)');
        sqlParams.search = `%${q}%`;
      }

      if (source && source !== 'all') {
        conditions.push('source = @source');
        sqlParams.source = source;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRow = ctx.sqliteDb
        .prepare(`SELECT COUNT(*) as total FROM history_records ${whereClause}`)
        .get(sqlParams);
      const total = countRow ? countRow.total : 0;

      const items = ctx.sqliteDb
        .prepare(
          `SELECT id, category, text, score, source, sessionId, createdAt FROM history_records ${whereClause} ORDER BY createdAt DESC LIMIT @limit OFFSET @offset`
        )
        .all({ ...sqlParams, limit, offset });

      return { items, total };
    }

    // JSON fallback
    const store = ctx.readJson();
    let filtered = [...store.history];

    if (q) {
      filtered = filtered.filter(
        (h) =>
          h.category.toLowerCase().includes(q) ||
          h.text.toLowerCase().includes(q) ||
          (h.tokens && h.tokens.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (source && source !== 'all') {
      filtered = filtered.filter((h) => h.source === source);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  async create(record: HistoryRecord): Promise<HistoryRecord> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const stmt = ctx.sqliteDb.prepare(
        `INSERT INTO history_records (id, category, text, score, source, sessionId, createdAt)
         VALUES (@id, @category, @text, @score, @source, @sessionId, @createdAt)`
      );
      stmt.run({
        id: record.id,
        category: record.category,
        text: record.text,
        score: record.score,
        source: record.source,
        sessionId: record.sessionId,
        createdAt: record.createdAt,
      });
      return record;
    }

    const store = ctx.readJson();
    store.history.unshift(record);
    ctx.writeJson(store);
    return record;
  }

  async deleteById(id: string): Promise<boolean> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const res = ctx.sqliteDb.prepare('DELETE FROM history_records WHERE id = ?').run(id);
      return res.changes > 0;
    }

    const store = ctx.readJson();
    const initLen = store.history.length;
    store.history = store.history.filter((h) => h.id !== id);
    if (store.history.length < initLen) {
      ctx.writeJson(store);
      return true;
    }
    return false;
  }

  async clearAll(): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const res = ctx.sqliteDb.prepare('DELETE FROM history_records').run();
      return res.changes;
    }

    const store = ctx.readJson();
    const count = store.history.length;
    store.history = [];
    ctx.writeJson(store);
    return count;
  }

  async getTotalCount(): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT COUNT(*) as cnt FROM history_records').get();
      return row ? row.cnt : 0;
    }

    const store = ctx.readJson();
    return store.history.length;
  }

  async getDistinctCategoriesCount(): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb
        .prepare('SELECT COUNT(DISTINCT category) as cnt FROM history_records')
        .get();
      return row ? row.cnt : 0;
    }

    const store = ctx.readJson();
    const set = new Set(store.history.map((h) => h.category));
    return set.size;
  }

  async getRecentCount(sinceIso: string): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb
        .prepare('SELECT COUNT(*) as cnt FROM history_records WHERE createdAt >= ?')
        .get(sinceIso);
      return row ? row.cnt : 0;
    }

    const store = ctx.readJson();
    const sinceTime = new Date(sinceIso).getTime();
    return store.history.filter((h) => new Date(h.createdAt).getTime() >= sinceTime).length;
  }
}
