import { getDatabaseContext } from '../db/connection.js';
import type { EvalRun, EvalCondition, EvalRunsResponse } from '@signbridge/shared';

export class EvalRunsRepository {
  async findAll(): Promise<EvalRunsResponse> {
    const ctx = getDatabaseContext();
    let runs: EvalRun[] = [];

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      runs = ctx.sqliteDb.prepare('SELECT * FROM eval_runs ORDER BY createdAt DESC').all();
    } else {
      const store = ctx.readJson();
      runs = store.evalRuns || [];
    }

    const byCondition: Record<EvalCondition, { averageAccuracy: number; totalRuns: number; totalSamples: number }> = {
      normal: { averageAccuracy: 0, totalRuns: 0, totalSamples: 0 },
      low_light: { averageAccuracy: 0, totalRuns: 0, totalSamples: 0 },
      backlit: { averageAccuracy: 0, totalRuns: 0, totalSamples: 0 },
      angle: { averageAccuracy: 0, totalRuns: 0, totalSamples: 0 },
      occluded: { averageAccuracy: 0, totalRuns: 0, totalSamples: 0 },
    };

    const conditionSums: Record<string, { totalAcc: number; count: number; samples: number }> = {};

    for (const r of runs) {
      const cond = r.condition as EvalCondition;
      if (!conditionSums[cond]) {
        conditionSums[cond] = { totalAcc: 0, count: 0, samples: 0 };
      }
      conditionSums[cond].totalAcc += r.accuracy;
      conditionSums[cond].count += 1;
      conditionSums[cond].samples += r.total;
    }

    for (const [cond, stats] of Object.entries(conditionSums)) {
      if (cond in byCondition) {
        byCondition[cond as EvalCondition] = {
          averageAccuracy: Number((stats.totalAcc / stats.count).toFixed(4)),
          totalRuns: stats.count,
          totalSamples: stats.samples,
        };
      }
    }

    return { runs, byCondition };
  }

  async create(run: EvalRun): Promise<EvalRun> {
    const ctx = getDatabaseContext();

    if (ctx.engine === 'better-sqlite3' && ctx.sqliteDb) {
      ctx.sqliteDb.prepare(
        `INSERT INTO eval_runs (id, modelId, condition, accuracy, total, createdAt)
         VALUES (@id, @modelId, @condition, @accuracy, @total, @createdAt)`
      ).run(run);
      return run;
    }

    const store = ctx.readJson();
    store.evalRuns.unshift(run);
    ctx.writeJson(store);
    return run;
  }
}
