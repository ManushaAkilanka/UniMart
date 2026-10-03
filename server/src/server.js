import { createServer } from 'http';
import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './services/socket.service.js';

const startServer = async () => {
  await connectDB();

  // Wrap Express in a plain HTTP server so Socket.IO can share the port
  const httpServer = createServer(app);

  // Boot Socket.IO (auth middleware runs DB queries, so must come after connectDB)
  initSocket(httpServer);

  httpServer.listen(ENV.PORT, () => {
    console.log(`[UniMart Server] Running on http://localhost:${ENV.PORT} in ${ENV.NODE_ENV} mode`);
    console.log(`[UniMart Server] Health check available at http://localhost:${ENV.PORT}/api/health`);
    console.log(`[UniMart Server] Socket.IO enabled on ws://localhost:${ENV.PORT}`);
  });

  const handleShutdown = (signal) => {
    console.log(`\n[UniMart Server] Received ${signal}. Shutting down gracefully...`);
    httpServer.close(() => {
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
