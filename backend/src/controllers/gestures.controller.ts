import type { Request, Response, NextFunction } from 'express';
import { GesturesService } from '../services/gestures.service.js';

const gesturesService = new GesturesService();

export async function getGestures(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gestures = await gesturesService.getAllGestures();
    res.json(gestures);
  } catch (error) {
    next(error);
  }
}

export async function updateGesture(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category } = req.params;
    const updated = await gesturesService.updateGesture(category, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
