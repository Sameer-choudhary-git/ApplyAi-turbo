import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export async function initializeRedis() {
  if (redisClient) return redisClient;

  const redisUrl =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "localhost"}:${parseInt(process.env.REDIS_PORT || "6380")}`;

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  await redisClient.connect();
  console.log("✅ Redis connected successfully");

  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call initializeRedis first.");
  }
  return redisClient;
}

/**
 * Get value from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (err) {
    console.error(`Cache GET error for key ${key}:`, err);
    return null;
  }
}

/**
 * Set value in cache with TTL (default 5 minutes)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`Cache SET error for key ${key}:`, err);
  }
}

/**
 * Delete cache key
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (err) {
    console.error(`Cache DELETE error for key ${key}:`, err);
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error(`Cache DELETE PATTERN error for pattern ${pattern}:`, err);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.flushDb();
  } catch (err) {
    console.error("Cache FLUSH error:", err);
  }
}