import type { Context, Next } from "hono";
import * as Sentry from "@sentry/node";
import { trackApiRequest } from "@applyai/sentry";

/**
 * Sentry middleware for API request context and error tracking
 * Should be applied early in the middleware stack
 */
export async function sentryContextMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const requestId = c.get?.("requestId") || c.req.headers.get?.("x-request-id");
  const userId = c.get?.("userId");

  return Sentry.withScope(async () => {
    try {
      // Set Sentry tags for all requests
      Sentry.setTag("http.method", method);
      Sentry.setTag("http.path", path);
      Sentry.setTag("service", "api");

      if (requestId) {
        Sentry.setTag("request_id", requestId);
      }

      // Set user context if authenticated
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      // Safely extract and set request headers
      try {
        const headers: Record<string, string> = {};
        const sensitiveHeaders = [
          "authorization",
          "cookie",
          "x-api-key",
          "x-auth-token",
          "x-csrf-token",
        ];

        if (c.req.headers instanceof Headers) {
          c.req.headers.forEach((value: string, key: string) => {
            if (!sensitiveHeaders.includes(key.toLowerCase())) {
              headers[key] = value;
            }
          });
        } else if (typeof c.req.headers === "object") {
          Object.entries(c.req.headers).forEach(([key, value]) => {
            if (!sensitiveHeaders.includes(key.toLowerCase())) {
              headers[key] = String(value);
            }
          });
        }

        Sentry.setContext("http_request", {
          method,
          path,
          url: c.req.url,
          headers,
          user_agent: c.req.headers.get?.("user-agent") || "unknown",
          ip: c.req.headers.get?.("x-forwarded-for") ||
              c.req.headers.get?.("cf-connecting-ip") ||
              "unknown",
        });
      } catch (e) {
        // Silently handle header extraction errors
      }

      // Execute the route handler
      await next();

      // Track successful API request
      const duration = Date.now() - startTime;
      trackApiRequest({
        method,
        path,
        statusCode: 200, // Success assumed if no error
        duration,
        userId,
        requestId,
      });

      // Add breadcrumb for successful request
      Sentry.addBreadcrumb({
        category: "http",
        message: `${method} ${path}`,
        level: "info",
        data: {
          duration_ms: duration,
        },
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failed API request
      trackApiRequest({
        method,
        path,
        statusCode: (error as any).statusCode || 500,
        duration,
        error: error as Error,
        userId,
        requestId,
      });

      throw error;
    }
  });
}

/**
 * Middleware to handle specific route operations with Sentry context
 */
export function sentryRouteMiddleware(operation: string) {
  return async (c: Context, next: Next) => {
    Sentry.setTag("operation", operation);

    try {
      await next();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation },
      });
      throw error;
    }
  };
}

/**
 * Add Sentry transaction for tracking specific operations
 */
export function withSentryTransaction(transactionName: string) {
  return async (c: Context, next: Next) => {
    return Sentry.startSpan(
      {
        name: transactionName,
        op: "http.server",
      },
      async () => {
        await next();
      }
    );
  };
}
