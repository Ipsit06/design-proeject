import { getDatabaseContext } from '../db/connection.js';
import type { TrainedModelMeta } from '@signbridge/shared';

export class ModelsRepository {
  async findAll(): Promise<TrainedModelMeta[]> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const rows = ctx.sqliteDb.prepare('SELECT * FROM models ORDER BY trainedAt DESC').all();
      return rows.map((r: any) => ({
        ...r,
        labels: JSON.parse(r.labels),
        metrics: JSON.parse(r.metrics),
      }));
    }

    const store = ctx.readJson();
    return store.models || [];
  }

  async findById(id: string): Promise<TrainedModelMeta | null> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT * FROM models WHERE id = ?').get(id);
      if (!row) return null;
      return {
        ...row,
        labels: JSON.parse(row.labels),
        metrics: JSON.parse(row.metrics),
      };
    }

    const store = ctx.readJson();
    return store.models.find((m) => m.id === id) || null;
  }

  async create(model: TrainedModelMeta): Promise<TrainedModelMeta> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare(
        `INSERT INTO models (id, name, kind, labels, metrics, trainedAt, sampleCount)
         VALUES (@id, @name, @kind, @labels, @metrics, @trainedAt, @sampleCount)`
      ).run({
        ...model,
        labels: JSON.stringify(model.labels),
        metrics: JSON.stringify(model.metrics),
      });
      return model;
    }

    const store = ctx.readJson();
    store.models.unshift(model);
    ctx.writeJson(store);
    return model;
  }

  async deleteById(id: string): Promise<boolean> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const res = ctx.sqliteDb.prepare('DELETE FROM models WHERE id = ?').run(id);
      return res.changes > 0;
    }

    const store = ctx.readJson();
    const len = store.models.length;
    store.models = store.models.filter((m) => m.id !== id);
    if (store.models.length < len) {
      ctx.writeJson(store);
      return true;
    }
    return false;
  }

  async getBestValAccuracy(): Promise<number | null> {
    const models = await this.findAll();
    if (models.length === 0) return null;

    let bestAcc: number | null = null;
    for (const m of models) {
      const acc = m.metrics.valAccuracy ?? m.metrics.accuracy;
      if (typeof acc === 'number') {
        if (bestAcc === null || acc > bestAcc) {
          bestAcc = acc;
        }
      }
    }
    return bestAcc;
  }
}
