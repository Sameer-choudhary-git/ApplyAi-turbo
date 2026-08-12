import pino from "pino";
import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",

  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
    : undefined,

  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie"
    ],
    censor: "[REDACTED]"
  }
}); 

/**
 * Enhanced request logger middleware with Sentry integration
 * Automatically sets up request context for error tracking
 */
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
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }

    const duration = Number((performance.now() - start).toFixed(2));

    // Log successful request
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

/**
 * Creates a Sentry-aware error logger
 * Automatically captures errors to Sentry while logging locally
 */
export function createSentryLogger(sentryClient?: any) {
  return {
    debug: (msg: string, data?: any) => {
      logger.debug({ msg, ...data });
    },
    info: (msg: string, data?: any) => {
      logger.info({ msg, ...data });
    },
    warn: (msg: string, data?: any) => {
      logger.warn({ msg, ...data });
      if (sentryClient?.captureMessage) {
        sentryClient.captureMessage(msg, "warning");
      }
    },
    error: (msg: string, error?: Error | any, data?: any) => {
      logger.error({ msg, error: error?.message || error, ...data });
      if (sentryClient?.captureException) {
        sentryClient.captureException(error || new Error(msg), {
          contexts: { additional: data }
        });
      }
    },
    fatal: (msg: string, error?: Error | any, data?: any) => {
      logger.fatal({ msg, error: error?.message || error, ...data });
      if (sentryClient?.captureException) {
        sentryClient.captureException(error || new Error(msg), {
          contexts: { additional: data }
        });
      }
    }
  };
}
