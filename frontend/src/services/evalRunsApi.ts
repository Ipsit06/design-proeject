import { apiRequest } from './apiClient.js';
import type { EvalRun, EvalRunsResponse, EvalCondition } from '@signbridge/shared';

export const evalRunsApi = {
  async list(): Promise<EvalRunsResponse> {
    return apiRequest<EvalRunsResponse>('/eval-runs');
  },

  async record(run: {
    modelId: string;
    condition: EvalCondition;
    accuracy: number;
    total: number;
  }): Promise<EvalRun> {
    return apiRequest<EvalRun>('/eval-runs', {
      method: 'POST',
      body: JSON.stringify(run),
    });
  },
};
