import { Router } from 'express';
import healthRoutes from './health.routes.js';
import historyRoutes from './history.routes.js';
import gesturesRoutes from './gestures.routes.js';
import settingsRoutes from './settings.routes.js';
import sessionsRoutes from './sessions.routes.js';
import statsRoutes from './stats.routes.js';
import samplesRoutes from './samples.routes.js';
import modelsRoutes from './models.routes.js';
import evalRunsRoutes from './evalRuns.routes.js';
import sanketRoutes from './sanket.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/history', historyRoutes);
apiRouter.use('/gestures', gesturesRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/sessions', sessionsRoutes);
apiRouter.use('/stats', statsRoutes);
apiRouter.use('/samples', samplesRoutes);
apiRouter.use('/models', modelsRoutes);
apiRouter.use('/eval-runs', evalRunsRoutes);
apiRouter.use('/sanket', sanketRoutes);

export default apiRouter;
