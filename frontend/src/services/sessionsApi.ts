import { apiRequest } from './apiClient.js';
import type { Session, SessionMode } from '@signbridge/shared';

export const sessionsApi = {
  async start(mode: SessionMode = 'live'): Promise<Session> {
    return apiRequest<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  async end(id: string): Promise<Session> {
    return apiRequest<Session>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ endedAt: new Date().toISOString() }),
    });
  },
};
