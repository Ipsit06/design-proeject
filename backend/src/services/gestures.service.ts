import { GesturesRepository } from '../repositories/gestures.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { GestureMapping } from '@signbridge/shared';

export class GesturesService {
  constructor(private repo: GesturesRepository = new GesturesRepository()) {}

  async getAllGestures(): Promise<GestureMapping[]> {
    return this.repo.findAll();
  }

  async updateGesture(
    category: string,
    data: { text?: string; enabled?: boolean }
  ): Promise<GestureMapping> {
    const updated = await this.repo.update(category, data);
    if (!updated) {
      throw new AppError(`Gesture category '${category}' not found`, 404, 'NOT_FOUND');
    }
    return updated;
  }
}
