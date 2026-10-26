import type { Request, Response, NextFunction } from 'express';
import { ModelsService } from '../services/models.service.js';
import { AppError } from '../middleware/errorHandler.js';

const modelsService = new ModelsService();

export async function getModels(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const models = await modelsService.listModels();
    res.json(models);
  } catch (error) {
    next(error);
  }
}

export async function createModel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const model = await modelsService.saveModelMeta(req.body);
    res.status(201).json(model);
  } catch (error) {
    next(error);
  }
}

export async function deleteModel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await modelsService.deleteModel(id);
    if (!deleted) {
      throw new AppError(`Model '${id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
