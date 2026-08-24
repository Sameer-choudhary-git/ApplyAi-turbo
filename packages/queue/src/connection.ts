import { Redis, type RedisOptions } from "ioredis";

const connectionOptions: RedisOptions = {
  maxRetriesPerRequest: null,
};

// Workers/schedulers may use a dedicated queue URL; fall back to the API's
// REDIS_URL so a shared Render Redis service works with one connection variable.
const redisUrl = process.env.REDIS_QUEUE_URL || process.env.REDIS_URL;

export const connection = process.env.DISABLE_REDIS === "true"
  ? undefined
  : redisUrl
  ? new Redis(redisUrl, connectionOptions)
  : new Redis({
      ...connectionOptions,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
        ? Number.parseInt(process.env.REDIS_PORT, 10)
        : undefined,
    });

