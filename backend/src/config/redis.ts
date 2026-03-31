import IORedis from 'ioredis';
import { config } from './index';

// BullMQ requires its own connection that it manages exclusively
export const bullRedisConnection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// General-purpose Redis client (rate limiting, caching, job status)
export const redisClient = new IORedis(config.redis.url, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

bullRedisConnection.on('error', (err) => {
  console.error('BullMQ Redis connection error:', err);
});
