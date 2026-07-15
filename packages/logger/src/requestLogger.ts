import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = performance.now();

    const requestId = randomUUID();

    c.set("requestId", requestId);

    await next();

    const duration = Number((performance.now() - start).toFixed(2));

    logger.info({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      ip:
        c.req.header("x-forwarded-for") ??
        c.req.header("cf-connecting-ip") ??
        "unknown",
      userId: c.get("userId") ?? null
    });
  };
};