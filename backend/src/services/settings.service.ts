import { SettingsRepository } from '../repositories/settings.repository.js';
import type { AppSettings } from '@signbridge/shared';

export class SettingsService {
  constructor(private repo: SettingsRepository = new SettingsRepository()) {}

  async getSettings(): Promise<AppSettings> {
    return this.repo.get();
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    return this.repo.update(data);
  }
}
