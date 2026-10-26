import { HistoryRepository } from '../repositories/history.repository.js';
import { SessionsRepository } from '../repositories/sessions.repository.js';
import { SamplesRepository } from '../repositories/samples.repository.js';
import { ModelsRepository } from '../repositories/models.repository.js';
import type { DashboardStats } from '@signbridge/shared';

export class StatsService {
  constructor(
    private historyRepo: HistoryRepository = new HistoryRepository(),
    private sessionsRepo: SessionsRepository = new SessionsRepository(),
    private samplesRepo: SamplesRepository = new SamplesRepository(),
    private modelsRepo: ModelsRepository = new ModelsRepository()
  ) {}

  /**
   * Computes dashboard statistics strictly from persistent store:
   * 1. totalSaved: Total count of records ever saved in history_records.
   * 2. distinctCategories: Count of unique 'category' identifiers appearing across saved records.
   * 3. completedSessions: Sessions where endedAt is not null.
   * 4. recentActivity: Count of records created within the last 7 rolling calendar days.
   * 5. samplesCount: Total custom landmark samples recorded in app.
   * 6. samplesPerLabel: Mapping of sample counts per label.
   * 7. modelsCount: Count of saved trained models.
   * 8. bestValAccuracy: Highest real validation accuracy achieved (null if no models).
   *
   * All metrics return 0 or null when no data exists. No fabricated or mocked numbers are used.
   */
  async getStats(): Promise<DashboardStats> {
    const totalSaved = await this.historyRepo.getTotalCount();
    const distinctCategories = await this.historyRepo.getDistinctCategoriesCount();
    const completedSessions = await this.sessionsRepo.getCompletedCount();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentActivity = await this.historyRepo.getRecentCount(sevenDaysAgo);

    // V2 Extended Statistics
    const samplesRes = await this.samplesRepo.findAll();
    const models = await this.modelsRepo.findAll();
    const bestValAccuracy = await this.modelsRepo.getBestValAccuracy();

    return {
      totalSaved,
      distinctCategories,
      completedSessions,
      recentActivity,
      samplesCount: samplesRes.total,
      samplesPerLabel: samplesRes.countsPerLabel,
      modelsCount: models.length,
      bestValAccuracy,
    };
  }
}
