import * as Sentry from "@sentry/node";
import type { Integration } from "@sentry/core";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export interface SentryNodeConfig {
  dsn: string;
  environment: string;
  debug?: boolean;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  beforeSend?: (event: Sentry.ErrorEvent) => Sentry.ErrorEvent | null;
  integrations?: Integration[];
}

/**
 * Initialize Sentry for Node.js/Backend applications
 * Should be called at the very start of your application
 */
export function initSentryNode(config: SentryNodeConfig): void {
  if (!config.dsn) {
    console.warn("âš ï¸  Sentry DSN not provided. Error reporting disabled.");
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    debug: config.debug ?? false,

    // Performance Monitoring
    tracesSampleRate: config.tracesSampleRate ?? 1.0,

    // Profiling
    profilesSampleRate: config.profilesSampleRate ?? 1.0,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration({ spans: true }),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      ...(config.integrations ?? []),
    ],

    // Custom before send for filtering/redacting sensitive data
    beforeSend: (event, hint) => {
      // Redact sensitive headers and query params
      if (event.request) {
        if (event.request.headers) {
          event.request.headers["Authorization"] = "[REDACTED]";
          event.request.headers["Cookie"] = "[REDACTED]";
          event.request.headers["X-API-Key"] = "[REDACTED]";
        }
        if (event.request.url) {
          event.request.url = event.request.url.replace(
            /([?&](token|apikey|password|secret)=)[^&]*/gi,
            "$1[REDACTED]"
          );
        }
      }

      // Call user-provided beforeSend if provided
      if (config.beforeSend) {
        return config.beforeSend(event);
      }

      return event;
    },

    // Ignore noisy errors
    ignoreErrors: [
      // Browser extensions
      /top\.GLOBALS/,
      // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      // Network request cancellations
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      // Common health check endpoints
      /health|ping|heartbeat/i,
    ],
  });

  console.log(`âœ… Sentry initialized for Node.js in ${config.environment} environment`);
}

/**
 * Capture an exception with Sentry.
 * FIX: previously called Sentry.captureException twice when `context` was
 * provided (once inside withScope, once unconditionally after). Now returns
 * from within the scoped branch so it only ever fires once.
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): string {
  if (context) {
    return Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      return Sentry.captureException(error) as string;
    });
  }
  return Sentry.captureException(error) as string;
}

/**
 * Capture a message with Sentry.
 * FIX: same double-capture bug as captureException, fixed the same way.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>
): string {
  if (context) {
    return Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      return Sentry.captureMessage(message, level) as string;
    });
  }
  return Sentry.captureMessage(message, level) as string;
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
  [key: string]: any;
}): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Set custom tags for better error grouping
 */
export function setTags(tags: Record<string, string>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Create a Sentry middleware for Hono
 */
export function sentryMiddleware() {
  return (c: any, next: () => Promise<void>) => {
    return Sentry.withScope(async () => {
      const startTime = Date.now();
      const requestId = c.get?.("requestId") || c.req.headers.get?.("x-request-id");
      const userId = c.get?.("userId");

      // Set tags
      Sentry.setTag("http.method", c.req.method);
      Sentry.setTag("http.path", c.req.path);
      if (requestId) {
        Sentry.setTag("request_id", requestId);
      }

      // Set user context
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      // Set request context with safe header extraction
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
          method: c.req.method,
          path: c.req.path,
          url: c.req.url,
          headers,
          user_agent: c.req.headers.get?.("user-agent") || "unknown",
        });
      } catch (e) {
        // Silently handle header extraction errors
      }

      try {
        await next();

        // Add successful request breadcrumb
        const duration = Date.now() - startTime;
        Sentry.addBreadcrumb({
          category: "http",
          message: `${c.req.method} ${c.req.path}`,
          level: "info",
          data: {
            method: c.req.method,
            path: c.req.path,
            duration_ms: duration,
            request_id: requestId,
          },
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        // Add error breadcrumb
        Sentry.addBreadcrumb({
          category: "http",
          message: `${c.req.method} ${c.req.path} - ERROR`,
          level: "error",
          data: {
            method: c.req.method,
            path: c.req.path,
            duration_ms: duration,
            request_id: requestId,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        Sentry.captureException(error);
        throw error;
      }
    });
  };
}

/**
 * Create a Sentry error handler middleware for Hono
 * This should be applied as the global error handler
 */
export function sentryErrorHandler() {
  return async (err: Error, c: any) => {
    const requestId = c.get?.("requestId") || c.req.headers.get?.("x-request-id");
    const userId = c.get?.("userId");

    return Sentry.withScope((scope) => {
      if (requestId) {
        scope.setTag("request_id", requestId);
      }

      if (userId) {
        scope.setUser({ id: userId });
      }

      scope.setContext("error_request", {
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
      });

      const eventId = Sentry.captureException(err);

      // Return error response
      return c.json(
        {
          success: false,
          error: {
            message: err.message || "Internal server error",
            code: (err as any).code,
            eventId: eventId, // Send event ID to client for debugging
          },
        },
        {
          status: (err as any).statusCode || 500,
        }
      );
    });
  };
}

/**
 * Capture handled errors with full context
 */
export function captureHandledError(
  error: Error,
  context?: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    operation?: string;
    metadata?: Record<string, any>;
  }
): string {
  return Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("request_id", context.requestId);
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.endpoint) scope.setTag("endpoint", context.endpoint);
    if (context?.operation) scope.setTag("operation", context.operation);

    if (context?.metadata) {
      Object.entries(context.metadata).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }

    return Sentry.captureException(error) as string;
  });
}

export default Sentry;export { trackApiRequest, trackJob, trackCronJob, trackDatabase, trackTransaction, addTraceBreadcrumb } from "./utils.js";

export function getSentryDSN(): string {
  return process.env.SENTRY_DSN ?? "";
}

export function getEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
}

export function isSentryEnabled(): boolean {
  const dsn = getSentryDSN();
  const explicitFlag = process.env.ENABLE_SENTRY ?? process.env.SENTRY_ENABLED;
  return Boolean(dsn) && (explicitFlag === undefined || explicitFlag === "true");
}
