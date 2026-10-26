import { Router } from 'express';
import { getGestures, updateGesture } from '../controllers/gestures.controller.js';
import { validateBody } from '../middleware/validate.js';
import { updateGestureSchema } from '../validators/index.js';

const router = Router();

router.get('/', getGestures);
router.put('/:category', validateBody(updateGestureSchema), updateGesture);

export default router;
