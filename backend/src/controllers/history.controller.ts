import type { Request, Response, NextFunction } from 'express';
import { HistoryService } from '../services/history.service.js';
import { AppError } from '../middleware/errorHandler.js';

const historyService = new HistoryService();

export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, source, limit, offset } = req.query as any;
    const result = await historyService.listHistory({
      q: q as string,
      source: source as any,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await historyService.createRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteHistoryItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await historyService.deleteRecord(id);
    if (!deleted) {
      throw new AppError(`History record '${id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function clearAllHistory(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deletedCount = await historyService.clearHistory();
    res.json({ message: 'All history records cleared', deletedCount });
  } catch (error) {
    next(error);
  }
}
