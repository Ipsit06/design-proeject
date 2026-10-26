import { Router } from 'express';
import { createSession, endSession } from '../controllers/sessions.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createSessionSchema, updateSessionSchema } from '../validators/index.js';

const router = Router();

router.post('/', validateBody(createSessionSchema), createSession);
router.patch('/:id', validateBody(updateSessionSchema), endSession);

export default router;
