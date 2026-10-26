import { getDatabaseContext } from '../db/connection.js';
import type { ISessionsRepository } from './types.js';
import type { Session } from '@signbridge/shared';

export class SessionsRepository implements ISessionsRepository {
  async create(session: Session): Promise<Session> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare(
        'INSERT INTO sessions (id, startedAt, endedAt, mode) VALUES (@id, @startedAt, @endedAt, @mode)'
      ).run(session);
      return session;
    }

    const store = ctx.readJson();
    store.sessions.push(session);
    ctx.writeJson(store);
    return session;
  }

  async findById(id: string): Promise<Session | null> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT id, startedAt, endedAt, mode FROM sessions WHERE id = ?').get(id);
      return row || null;
    }

    const store = ctx.readJson();
    return store.sessions.find((s) => s.id === id) || null;
  }

  async endSession(id: string, endedAt: string): Promise<Session | null> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare('UPDATE sessions SET endedAt = ? WHERE id = ?').run(endedAt, id);
      return this.findById(id);
    }

    const store = ctx.readJson();
    const session = store.sessions.find((s) => s.id === id);
    if (!session) return null;
    session.endedAt = endedAt;
    ctx.writeJson(store);
    return session;
  }

  async getCompletedCount(): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE endedAt IS NOT NULL').get();
      return row ? row.cnt : 0;
    }

    const store = ctx.readJson();
    return store.sessions.filter((s) => s.endedAt !== null && s.endedAt !== undefined).length;
  }
}
