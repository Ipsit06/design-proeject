import { apiRequest } from './apiClient.js';
import type { AppSettings } from '@signbridge/shared';

const LOCAL_STORAGE_KEY = 'signbridge_settings';

export const DEFAULT_LOCAL_SETTINGS: AppSettings = {
  speechEnabled: true,
  speechRate: 1.0,
  confidenceThreshold: 0.65,
  autoSpeak: false,
};

export const settingsApi = {
  async get(): Promise<AppSettings> {
    try {
      const data = await apiRequest<AppSettings>('/settings');
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch {
      // Local fallback if backend is offline
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      return DEFAULT_LOCAL_SETTINGS;
    }
  },

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const updated = await apiRequest<AppSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      // Cache locally even if backend is offline
      const current = await this.get();
      const updated: AppSettings = { ...current, ...settings };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
  },
};
