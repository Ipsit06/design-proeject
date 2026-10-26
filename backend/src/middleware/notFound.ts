import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@signbridge/shared';

export function notFound(req: Request, res: Response<ApiErrorResponse>): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: [],
    },
  });
}
