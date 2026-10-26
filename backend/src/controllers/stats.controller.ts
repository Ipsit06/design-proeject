import type { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/stats.service.js';

const statsService = new StatsService();

export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await statsService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
