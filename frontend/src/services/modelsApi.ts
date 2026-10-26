import { apiRequest } from './apiClient.js';
import type { TrainedModelMeta } from '@signbridge/shared';

export const modelsApi = {
  async list(): Promise<TrainedModelMeta[]> {
    return apiRequest<TrainedModelMeta[]>('/models');
  },

  async create(model: TrainedModelMeta): Promise<TrainedModelMeta> {
    return apiRequest<TrainedModelMeta>('/models', {
      method: 'POST',
      body: JSON.stringify(model),
    });
  },

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/models/${id}`, {
      method: 'DELETE',
    });
  },
};
