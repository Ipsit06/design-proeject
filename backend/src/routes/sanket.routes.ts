import { Router } from 'express';
import { translateVideo } from '../controllers/sanket.controller.js';

const router = Router();
router.post('/translate', translateVideo);

export default router;
