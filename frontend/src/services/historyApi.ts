import { apiRequest } from './apiClient.js';
import type { HistoryRecord, HistoryListResponse, HistorySource } from '@signbridge/shared';

export interface HistoryQuery {
  q?: string;
  source?: 'all' | 'live' | 'demo' | 'experimental';
  limit?: number;
  offset?: number;
}

export const historyApi = {
  async list(query: HistoryQuery = {}): Promise<HistoryListResponse> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.source && query.source !== 'all') params.set('source', query.source);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));

    const qs = params.toString();
    return apiRequest<HistoryListResponse>(`/history${qs ? `?${qs}` : ''}`);
  },

  async create(data: {
    category: string;
    text: string;
    score?: number | null;
    source: HistorySource;
    sessionId?: string | null;
    tokens?: string[];
    recognitionModel?: string;
    vocabularyId?: string;
    aiAssisted?: boolean;
  }): Promise<HistoryRecord> {
    return apiRequest<HistoryRecord>('/history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/history/${id}`, {
      method: 'DELETE',
    });
  },

  async clearAll(): Promise<{ message: string; deletedCount: number }> {
    return apiRequest<{ message: string; deletedCount: number }>('/history', {
      method: 'DELETE',
    });
  },
};
