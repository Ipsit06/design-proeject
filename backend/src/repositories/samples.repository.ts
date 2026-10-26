import { getDatabaseContext } from '../db/connection.js';
import type { Sample, SampleKind, SamplesListResponse } from '@signbridge/shared';

export class SamplesRepository {
  async findAll(filter?: { label?: string; kind?: SampleKind }): Promise<SamplesListResponse> {
    const ctx = getDatabaseContext();
    const label = filter?.label?.trim().toLowerCase();
    const kind = filter?.kind;

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const conditions: string[] = [];
      const sqlParams: any = {};

      if (label) {
        conditions.push('LOWER(label) = @label');
        sqlParams.label = label;
      }
      if (kind) {
        conditions.push('kind = @kind');
        sqlParams.kind = kind;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = ctx.sqliteDb
        .prepare(`SELECT * FROM samples ${whereClause} ORDER BY createdAt DESC`)
        .all(sqlParams);

      const items: Sample[] = rows.map((r: any) => ({
        ...r,
        features: JSON.parse(r.features),
      }));

      // Compute counts
      const countsPerLabel: Record<string, number> = {};
      const countsPerKind: Record<SampleKind, number> = { static: 0, sequence: 0 };

      const allRows = ctx.sqliteDb.prepare('SELECT label, kind FROM samples').all();
      for (const row of allRows) {
        countsPerLabel[row.label] = (countsPerLabel[row.label] || 0) + 1;
        if (row.kind in countsPerKind) {
          countsPerKind[row.kind as SampleKind] += 1;
        }
      }

      return {
        items,
        total: items.length,
        countsPerLabel,
        countsPerKind,
      };
    }

    // JSON store fallback
    const store = ctx.readJson();
    let filtered = [...store.samples];

    if (label) {
      filtered = filtered.filter((s) => s.label.toLowerCase() === label);
    }
    if (kind) {
      filtered = filtered.filter((s) => s.kind === kind);
    }

    const countsPerLabel: Record<string, number> = {};
    const countsPerKind: Record<SampleKind, number> = { static: 0, sequence: 0 };

    for (const s of store.samples) {
      countsPerLabel[s.label] = (countsPerLabel[s.label] || 0) + 1;
      if (s.kind in countsPerKind) {
        countsPerKind[s.kind] += 1;
      }
    }

    return {
      items: filtered,
      total: filtered.length,
      countsPerLabel,
      countsPerKind,
    };
  }

  async create(sample: Sample): Promise<Sample> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare(
        `INSERT INTO samples (id, label, kind, features, handsCount, lighting, sessionId, createdAt)
         VALUES (@id, @label, @kind, @features, @handsCount, @lighting, @sessionId, @createdAt)`
      ).run({
        ...sample,
        features: JSON.stringify(sample.features),
      });
      return sample;
    }

    const store = ctx.readJson();
    store.samples.unshift(sample);
    ctx.writeJson(store);
    return sample;
  }

  async createBulk(samples: Sample[]): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const insert = ctx.sqliteDb.prepare(
        `INSERT INTO samples (id, label, kind, features, handsCount, lighting, sessionId, createdAt)
         VALUES (@id, @label, @kind, @features, @handsCount, @lighting, @sessionId, @createdAt)`
      );
      const transaction = ctx.sqliteDb.transaction((items: Sample[]) => {
        for (const item of items) {
          insert.run({
            ...item,
            features: JSON.stringify(item.features),
          });
        }
      });
      transaction(samples);
      return samples.length;
    }

    const store = ctx.readJson();
    store.samples.unshift(...samples);
    ctx.writeJson(store);
    return samples.length;
  }

  async deleteById(id: string): Promise<boolean> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const res = ctx.sqliteDb.prepare('DELETE FROM samples WHERE id = ?').run(id);
      return res.changes > 0;
    }

    const store = ctx.readJson();
    const len = store.samples.length;
    store.samples = store.samples.filter((s) => s.id !== id);
    if (store.samples.length < len) {
      ctx.writeJson(store);
      return true;
    }
    return false;
  }

  async deleteByLabel(label: string): Promise<number> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const res = ctx.sqliteDb.prepare('DELETE FROM samples WHERE LOWER(label) = LOWER(?)').run(label);
      return res.changes;
    }

    const store = ctx.readJson();
    const len = store.samples.length;
    store.samples = store.samples.filter((s) => s.label.toLowerCase() !== label.toLowerCase());
    const deletedCount = len - store.samples.length;
    if (deletedCount > 0) {
      ctx.writeJson(store);
    }
    return deletedCount;
  }

  async getAllForExport(): Promise<Sample[]> {
    const res = await this.findAll();
    return res.items;
  }

  async getTotalCount(): Promise<number> {
    const ctx = getDatabaseContext();
    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      const row = ctx.sqliteDb.prepare('SELECT COUNT(*) as cnt FROM samples').get();
      return row ? row.cnt : 0;
    }
    const store = ctx.readJson();
    return store.samples.length;
  }
}
