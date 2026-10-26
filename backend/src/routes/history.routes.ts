import { Router } from 'express';
import {
  getHistory,
  createHistory,
  deleteHistoryItem,
  clearAllHistory,
} from '../controllers/history.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createHistorySchema, queryHistorySchema } from '../validators/index.js';

const router = Router();

router.get('/', validateQuery(queryHistorySchema), getHistory);
router.post('/', validateBody(createHistorySchema), createHistory);
router.delete('/', clearAllHistory);
router.delete('/:id', deleteHistoryItem);

export default router;
