import type { Request, Response, NextFunction } from 'express';
import { SamplesService } from '../services/samples.service.js';
import { AppError } from '../middleware/errorHandler.js';

const samplesService = new SamplesService();

export async function getSamples(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { label, kind } = req.query as any;
    const result = await samplesService.listSamples({ label, kind });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createSample(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sample = await samplesService.createSample(req.body);
    res.status(201).json(sample);
  } catch (error) {
    next(error);
  }
}

export async function createBulkSamples(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { samples } = req.body;
    const result = await samplesService.createBulkSamples(samples);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSample(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await samplesService.deleteSample(id);
    if (!deleted) {
      throw new AppError(`Sample '${id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteSamplesByQuery(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { label } = req.query as any;
    if (!label) {
      throw new AppError('Label query parameter is required for bulk delete', 400, 'VALIDATION_ERROR');
    }
    const deletedCount = await samplesService.deleteSamplesByLabel(label);
    res.json({ message: `Deleted ${deletedCount} samples for label '${label}'`, deletedCount });
  } catch (error) {
    next(error);
  }
}

export async function exportSamples(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await samplesService.exportSamples();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function importSamples(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const samples = Array.isArray(req.body) ? req.body : req.body.samples;
    if (!Array.isArray(samples)) {
      throw new AppError('Import payload must be an array of samples or contain a samples array', 400, 'VALIDATION_ERROR');
    }
    const result = await samplesService.importSamples(samples);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
