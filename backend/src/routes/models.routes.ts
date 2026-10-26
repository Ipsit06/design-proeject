import { Router } from 'express';
import { getModels, createModel, deleteModel } from '../controllers/models.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createModelSchema } from '../validators/index.js';

const router = Router();

router.get('/', getModels);
router.post('/', validateBody(createModelSchema), createModel);
router.delete('/:id', deleteModel);

export default router;
