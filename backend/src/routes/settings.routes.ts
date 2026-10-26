import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { validateBody } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/index.js';

const router = Router();

router.get('/', getSettings);
router.put('/', validateBody(updateSettingsSchema), updateSettings);

export default router;
