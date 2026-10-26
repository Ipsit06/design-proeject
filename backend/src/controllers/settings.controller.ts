import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';

const settingsService = new SettingsService();

export async function getSettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updated = await settingsService.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
