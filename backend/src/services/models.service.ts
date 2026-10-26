import { v4 as uuidv4 } from 'uuid';
import { ModelsRepository } from '../repositories/models.repository.js';
import type { TrainedModelMeta } from '@signbridge/shared';

export class ModelsService {
  constructor(private modelsRepo: ModelsRepository = new ModelsRepository()) {}

  async listModels(): Promise<TrainedModelMeta[]> {
    return this.modelsRepo.findAll();
  }

  async saveModelMeta(input: Omit<TrainedModelMeta, 'id' | 'trainedAt'> & { id?: string }): Promise<TrainedModelMeta> {
    const model: TrainedModelMeta = {
      id: input.id || uuidv4(),
      name: input.name,
      kind: input.kind,
      labels: input.labels,
      metrics: input.metrics,
      sampleCount: input.sampleCount,
      trainedAt: new Date().toISOString(),
    };
    return this.modelsRepo.create(model);
  }

  async deleteModel(id: string): Promise<boolean> {
    return this.modelsRepo.deleteById(id);
  }
}
