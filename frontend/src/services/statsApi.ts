import { apiRequest } from './apiClient.js';
import type { DashboardStats } from '@signbridge/shared';

export const statsApi = {
  async get(): Promise<DashboardStats> {
    return apiRequest<DashboardStats>('/stats');
  },
};
