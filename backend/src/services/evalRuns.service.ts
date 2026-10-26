import { v4 as uuidv4 } from 'uuid';
import { EvalRunsRepository } from '../repositories/evalRuns.repository.js';
import type { EvalRun, EvalRunsResponse } from '@signbridge/shared';

export class EvalRunsService {
  constructor(private evalRunsRepo: EvalRunsRepository = new EvalRunsRepository()) {}

  async listEvalRuns(): Promise<EvalRunsResponse> {
    return this.evalRunsRepo.findAll();
  }

  async recordEvalRun(input: Omit<EvalRun, 'id' | 'createdAt'>): Promise<EvalRun> {
    const run: EvalRun = {
      id: uuidv4(),
      modelId: input.modelId,
      condition: input.condition,
      accuracy: Number(input.accuracy.toFixed(4)),
      total: input.total,
      createdAt: new Date().toISOString(),
    };
    return this.evalRunsRepo.create(run);
  }
}
