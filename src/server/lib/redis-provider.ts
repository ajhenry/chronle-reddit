import type { RedisClient } from '@devvit/redis';
import { isDevelopment } from '../../shared/utils';

/**
 * Redis provider that conditionally returns the correct Redis client based on environment.
 *
 * - LOCAL_MODE: Uses ioredis package connecting to local Redis instance
 * - Production: Uses Devvit's built-in Redis
 *
 * Both return a RedisClient with compatible API (get, set, del, expire, etc.)
 */

let redisClientInstance: RedisClient | null = null;
let initializationPromise: Promise<RedisClient> | null = null;

export async function getRedisClient(): Promise<RedisClient> {
  if (redisClientInstance) {
    return redisClientInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (isDevelopment()) {
        // LOCAL_MODE: Use ioredis with local connection
        const Redis = (await import('ioredis')).default;

        const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

        // Handle connection events
        client.on('error', (err: Error) => {
          console.error('[REDIS] Connection error:', err);
        });

        client.on('connect', () => {
          console.log('[REDIS] Connected to local Redis instance');
        });

        redisClientInstance = client as unknown as RedisClient;
        return client as unknown as RedisClient;
      } else {
        // Production: Use Devvit's built-in Redis
        const devvitRedis = await import('@devvit/redis');
        redisClientInstance = devvitRedis.redis;
        return devvitRedis.redis;
      }
    })();
  }

  return initializationPromise;
}
