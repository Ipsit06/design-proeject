import type { Request, Response } from 'express';
import { getDatabaseContext } from '../db/connection.js';
import { env } from '../config/env.js';
import type { HealthResponse } from '@signbridge/shared';

export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  const ctx = getDatabaseContext();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: '2.0.0',
    database: 'connected',
    engine: ctx.engine,
    llmConfigured: Boolean(env.GEMINI_API_KEY),
    harshilModelsLoaded: true,
  });
}
