import { createApp } from './app.js';
import { env } from './config/env.js';
import { getDatabaseContext } from './db/connection.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[SignBridge Backend] Running on http://localhost:${env.PORT}`);
  console.log(`[SignBridge Backend] Health check: http://localhost:${env.PORT}/api/health`);
});

function gracefulShutdown(signal: string) {
  console.log(`\n[SignBridge Backend] Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('[SignBridge Backend] HTTP server closed.');
    const ctx = getDatabaseContext();
    ctx.close();
    process.exit(0);
  });

  // Force close after 5 seconds if not closed
  setTimeout(() => {
    console.error('[SignBridge Backend] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
