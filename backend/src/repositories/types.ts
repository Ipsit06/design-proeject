import type {
  HistoryRecord,
  GestureMapping,
  AppSettings,
  Session,
} from '@signbridge/shared';

export interface HistoryFilterParams {
  q?: string;
  source?: 'all' | 'live' | 'demo';
  limit?: number;
  offset?: number;
}

export interface IHistoryRepository {
  findMany(params: HistoryFilterParams): Promise<{ items: HistoryRecord[]; total: number }>;
  create(record: HistoryRecord): Promise<HistoryRecord>;
  deleteById(id: string): Promise<boolean>;
  clearAll(): Promise<number>;
  getTotalCount(): Promise<number>;
  getDistinctCategoriesCount(): Promise<number>;
  getRecentCount(sinceIso: string): Promise<number>;
}

export interface IGesturesRepository {
  findAll(): Promise<GestureMapping[]>;
  findByCategory(category: string): Promise<GestureMapping | null>;
  update(
    category: string,
    data: { text?: string; enabled?: boolean }
  ): Promise<GestureMapping | null>;
}

export interface ISettingsRepository {
  get(): Promise<AppSettings>;
  update(settings: Partial<AppSettings>): Promise<AppSettings>;
}

export interface ISessionsRepository {
  create(session: Session): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  endSession(id: string, endedAt: string): Promise<Session | null>;
  getCompletedCount(): Promise<number>;
}
