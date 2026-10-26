import { apiRequest } from './apiClient.js';
import type { GestureMapping } from '@signbridge/shared';

export const gesturesApi = {
  async getAll(): Promise<GestureMapping[]> {
    return apiRequest<GestureMapping[]>('/gestures');
  },

  async update(category: string, data: { text?: string; enabled?: boolean }): Promise<GestureMapping> {
    return apiRequest<GestureMapping>(`/gestures/${encodeURIComponent(category)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
