import type { Request, Response, NextFunction } from 'express';
import { SessionsService } from '../services/sessions.service.js';

const sessionsService = new SessionsService();

export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { mode } = req.body;
    const session = await sessionsService.startSession(mode);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

export async function endSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { endedAt } = req.body;
    const session = await sessionsService.endSession(id, endedAt);
    res.json(session);
  } catch (error) {
    next(error);
  }
}
