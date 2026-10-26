import type { Request, Response, NextFunction } from 'express';
import { SanketService } from '../services/sanket.service.js';

const service = new SanketService();

export async function translateVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.translateVideo(req.body?.videoData || ''));
  } catch (error) {
    next(error);
  }
}
