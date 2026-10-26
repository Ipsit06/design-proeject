import { v4 as uuidv4 } from 'uuid';
import { HistoryRepository } from '../repositories/history.repository.js';
import type { HistoryRecord, HistorySource } from '@signbridge/shared';
import type { HistoryFilterParams } from '../repositories/types.js';

export class HistoryService {
  constructor(private repo: HistoryRepository = new HistoryRepository()) {}

  async listHistory(params: HistoryFilterParams) {
    return this.repo.findMany(params);
  }

  async createRecord(input: {
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
    const record: HistoryRecord = {
      id: uuidv4(),
      category: input.category,
      text: input.text,
      score: input.score !== undefined ? input.score : null,
      source: input.source,
      sessionId: input.sessionId || null,
      tokens: input.tokens || [input.category],
      recognitionModel: input.recognitionModel || 'mediapipe_generic',
      vocabularyId: input.vocabularyId || 'generic_gestures',
      aiAssisted: input.aiAssisted || false,
      createdAt: new Date().toISOString(),
    };

    return this.repo.create(record);
  }

  async deleteRecord(id: string): Promise<boolean> {
    return this.repo.deleteById(id);
  }

  async clearHistory(): Promise<number> {
    return this.repo.clearAll();
  }
}
