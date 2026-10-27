import { Router } from 'express';
import { assistTokens } from '../controllers/llm.controller.js';

const router = Router();

router.post('/assist', assistTokens);

export default router;
