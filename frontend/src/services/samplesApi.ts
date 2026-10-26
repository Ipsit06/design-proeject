import { apiRequest } from './apiClient.js';
import type { Sample, SampleKind, SamplesListResponse } from '@signbridge/shared';

export const samplesApi = {
  async list(filter?: { label?: string; kind?: SampleKind }): Promise<SamplesListResponse> {
    const params = new URLSearchParams();
    if (filter?.label) params.set('label', filter.label);
    if (filter?.kind) params.set('kind', filter.kind);
    const qs = params.toString();
    return apiRequest<SamplesListResponse>(`/samples${qs ? `?${qs}` : ''}`);
  },

  async create(sample: Omit<Sample, 'id' | 'createdAt'>): Promise<Sample> {
    return apiRequest<Sample>('/samples', {
      method: 'POST',
      body: JSON.stringify(sample),
    });
  },

  async createBulk(samples: Array<Omit<Sample, 'id' | 'createdAt'>>): Promise<{ count: number }> {
    return apiRequest<{ count: number }>('/samples/bulk', {
      method: 'POST',
      body: JSON.stringify({ samples }),
    });
  },

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/samples/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteByLabel(label: string): Promise<{ message: string; deletedCount: number }> {
    return apiRequest<{ message: string; deletedCount: number }>(
      `/samples?label=${encodeURIComponent(label)}`,
      {
        method: 'DELETE',
      }
    );
  },

  async exportSamples(): Promise<{ samples: Sample[]; exportedAt: string; total: number }> {
    return apiRequest<{ samples: Sample[]; exportedAt: string; total: number }>('/samples/export');
  },

  async importSamples(samples: Sample[]): Promise<{ importedCount: number }> {
    return apiRequest<{ importedCount: number }>('/samples/import', {
      method: 'POST',
      body: JSON.stringify({ samples }),
    });
  },
};
