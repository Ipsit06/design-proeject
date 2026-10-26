import type { Request, Response, NextFunction } from 'express';
import { EvalRunsService } from '../services/evalRuns.service.js';

const evalRunsService = new EvalRunsService();

export async function getEvalRuns(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await evalRunsService.listEvalRuns();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function recordEvalRun(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const run = await evalRunsService.recordEvalRun(req.body);
    res.status(201).json(run);
  } catch (error) {
    next(error);
  }
}
