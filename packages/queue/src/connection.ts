import { Redis, type RedisOptions } from "ioredis";

const connectionOptions: RedisOptions = {
  maxRetriesPerRequest: null,
};

export const connection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, connectionOptions)
  : new Redis({
      ...connectionOptions,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
        ? Number.parseInt(process.env.REDIS_PORT, 10)
        : undefined,
    });
