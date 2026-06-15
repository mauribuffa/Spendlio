import IORedis, { type Redis } from 'ioredis';

/**
 * BullMQ connection config from REDIS_URL (see .env / docker-compose).
 *
 * We hand BullMQ connection *options* (not a constructed client) so it owns the
 * ioredis instance it blocks on — this also avoids cross-version `Redis` type
 * clashes when bullmq pins a different ioredis than ours. BullMQ requires
 * maxRetriesPerRequest: null on the connection it blocks on.
 */
export function getConnectionOptions(): { url: string; maxRetriesPerRequest: null } {
  return {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    maxRetriesPerRequest: null,
  };
}

/**
 * A raw shared ioredis client for non-BullMQ uses (health checks, caching).
 * BullMQ does NOT use this — it builds its own from getConnectionOptions().
 */
let client: Redis | undefined;

export function getRedisClient(): Redis {
  if (!client) {
    client = new IORedis(getConnectionOptions().url, { maxRetriesPerRequest: null });
  }
  return client;
}

/** Close the raw client (graceful shutdown / tests). */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
