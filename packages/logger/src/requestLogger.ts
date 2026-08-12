import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = performance.now();

    const requestId = randomUUID();

    c.set("requestId", requestId);

    try {
      await next();
    } catch (error) {
      const duration = Number((performance.now() - start).toFixed(2));

      // Log error with full context
      logger.error({
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status || 500,
        duration,
        ip:
          c.req.header("x-forwarded-for") ??
          c.req.header("cf-connecting-ip") ??
          "unknown",
        userId: c.get("userId") ?? null,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }

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
