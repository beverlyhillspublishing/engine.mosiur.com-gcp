import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { startWorkers, stopWorkers } from './queues/workers';
import { prisma } from './config/database';
import { redisClient, bullRedisConnection } from './config/redis';

async function main() {
  // Verify DB connection
  await prisma.$connect();
  logger.info('Database connected');

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'TechyPark backend started');
  });

  // Start BullMQ workers
  startWorkers();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      logger.info('HTTP server closed');
      await stopWorkers();
      await prisma.$disconnect();
      await redisClient.quit();
      await bullRedisConnection.quit();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
