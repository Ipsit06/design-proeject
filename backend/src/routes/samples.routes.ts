import { Router } from 'express';
import {
  getSamples,
  createSample,
  createBulkSamples,
  deleteSample,
  deleteSamplesByQuery,
  exportSamples,
  importSamples,
} from '../controllers/samples.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createSampleSchema, bulkSamplesSchema } from '../validators/index.js';

const router = Router();

router.get('/export', exportSamples);
router.post('/import', importSamples);

router.get('/', getSamples);
router.post('/', validateBody(createSampleSchema), createSample);
router.post('/bulk', validateBody(bulkSamplesSchema), createBulkSamples);
router.delete('/', deleteSamplesByQuery);
router.delete('/:id', deleteSample);

export default router;
