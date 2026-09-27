import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    console.log(`[UniMart Server] Running on http://localhost:${ENV.PORT} in ${ENV.NODE_ENV} mode`);
    console.log(`[UniMart Server] Health check available at http://localhost:${ENV.PORT}/api/health`);
  });

  const handleShutdown = (signal) => {
    console.log(`\n[UniMart Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[UniMart Server] Closed HTTP server.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('[UniMart Server] Fatal startup error:', err);
  process.exit(1);
});
