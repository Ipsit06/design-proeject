import { Router } from 'express';
import { getEvalRuns, recordEvalRun } from '../controllers/evalRuns.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createEvalRunSchema } from '../validators/index.js';

const router = Router();

router.get('/', getEvalRuns);
router.post('/', validateBody(createEvalRunSchema), recordEvalRun);

export default router;
