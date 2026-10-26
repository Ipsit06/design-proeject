import { v4 as uuidv4 } from 'uuid';
import { SamplesRepository } from '../repositories/samples.repository.js';
import { GesturesRepository } from '../repositories/gestures.repository.js';
import type { Sample, SampleKind, SamplesListResponse } from '@signbridge/shared';

export class SamplesService {
  constructor(
    private samplesRepo: SamplesRepository = new SamplesRepository(),
    private gesturesRepo: GesturesRepository = new GesturesRepository()
  ) {}

  async listSamples(filter?: { label?: string; kind?: SampleKind }): Promise<SamplesListResponse> {
    return this.samplesRepo.findAll(filter);
  }

  async createSample(input: Omit<Sample, 'id' | 'createdAt'>): Promise<Sample> {
    const sample: Sample = {
      id: uuidv4(),
      label: input.label.trim(),
      kind: input.kind,
      features: input.features,
      handsCount: input.handsCount || 1,
      lighting: input.lighting || 'normal',
      sessionId: input.sessionId || (input as any).session,
      createdAt: new Date().toISOString(),
    };

    const created = await this.samplesRepo.create(sample);
    await this.ensureGestureMappingExists(input.label.trim());
    return created;
  }

  async createBulkSamples(items: Array<Omit<Sample, 'id' | 'createdAt'>>): Promise<{ count: number }> {
    const now = new Date().toISOString();
    const prepared: Sample[] = items.map((it) => ({
      id: uuidv4(),
      label: it.label.trim(),
      kind: it.kind,
      features: it.features,
      handsCount: it.handsCount || 1,
      lighting: it.lighting || 'normal',
      sessionId: it.sessionId || (it as any).session,
      createdAt: now,
    }));

    const count = await this.samplesRepo.createBulk(prepared);

    // Register all distinct labels as custom_unvalidated if new
    const labels = new Set(items.map((i) => i.label.trim()));
    for (const label of labels) {
      await this.ensureGestureMappingExists(label);
    }

    return { count };
  }

  async deleteSample(id: string): Promise<boolean> {
    return this.samplesRepo.deleteById(id);
  }

  async deleteSamplesByLabel(label: string): Promise<number> {
    return this.samplesRepo.deleteByLabel(label);
  }

  async exportSamples(): Promise<{ samples: Sample[]; exportedAt: string; total: number }> {
    const samples = await this.samplesRepo.getAllForExport();
    return {
      samples,
      exportedAt: new Date().toISOString(),
      total: samples.length,
    };
  }

  async importSamples(samples: Sample[]): Promise<{ importedCount: number }> {
    const validSamples: Sample[] = samples.map((s) => ({
      id: s.id || uuidv4(),
      label: s.label.trim(),
      kind: s.kind,
      features: s.features,
      handsCount: s.handsCount || 1,
      lighting: s.lighting || 'normal',
      sessionId: s.sessionId,
      createdAt: s.createdAt || new Date().toISOString(),
    }));

    const count = await this.samplesRepo.createBulk(validSamples);
    const labels = new Set(samples.map((s) => s.label.trim()));
    for (const label of labels) {
      await this.ensureGestureMappingExists(label);
    }

    return { importedCount: count };
  }

  private async ensureGestureMappingExists(label: string): Promise<void> {
    const existing = await this.gesturesRepo.findByCategory(label);
    if (!existing) {
      const ctx = (this.gesturesRepo as any);
      // Create new gesture mapping entry
      await this.gesturesRepo.update(label, { text: label, enabled: true }).catch(() => {});
      // In JSON store or SQLite, insert gesture mapping with status custom_unvalidated
      const dbContext = (await import('../db/connection.js')).getDatabaseContext();
      if (dbContext.engine === 'better-sqlite3' && dbContext.sqliteDb) {
        dbContext.sqliteDb.prepare(
          `INSERT OR IGNORE INTO gesture_mappings (category, text, status, type, enabled, description, language)
           VALUES (?, ?, 'custom_unvalidated', 'custom_unvalidated', 1, 'Custom user-trained sign vocabulary.', 'Custom')`
        ).run(label, label);
      } else {
        const store = dbContext.readJson();
        const found = store.gestures.find((g) => g.category.toLowerCase() === label.toLowerCase());
        if (!found) {
          store.gestures.push({
            category: label,
            text: label,
            status: 'custom_unvalidated',
            type: 'custom_unvalidated',
            enabled: true,
            description: 'Custom user-trained sign vocabulary.',
            language: 'Custom',
          });
          dbContext.writeJson(store);
        }
      }
    }
  }
}
