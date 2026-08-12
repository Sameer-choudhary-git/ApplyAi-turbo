import type { Context } from "hono";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { captureHandledError } from "@applyai/sentry";

export function errorHandler(err: Error, c: Context) {
  const method = c.req.method;
  const path = c.req.path;
  const requestId = c.get?.("requestId") || c.req.headers.get?.("x-request-id");
  const userId = c.get?.("userId");

  console.error(`[ERROR] ${method} ${path}`, err);

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    const issues = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));

    // Capture validation error in Sentry with context
    Sentry.withScope((scope) => {
      scope.setTag("error_type", "validation");
      scope.setTag("http_method", method);
      scope.setTag("http_path", path);
      
      if (requestId) scope.setTag("request_id", requestId);
      if (userId) scope.setUser({ id: userId });

      scope.setContext("validation_error", {
        field_count: issues.length,
        issues: issues.slice(0, 10), // Limit to first 10 issues
      });

      Sentry.captureMessage(`Validation error on ${method} ${path}`, "warning");
    });

    return c.json(
      {
        success: false,
        error: "Validation failed",
        issues,
      },
      400,
    );
  }

  // Capture all other errors with full context
  const errorInfo = {
    requestId,
    userId,
    endpoint: `${method} ${path}`,
    operation: "request_handling",
    metadata: {
      status: (err as any).statusCode || 500,
      code: (err as any).code,
      name: err.name,
    },
  };

  captureHandledError(err, errorInfo);

  // Determine status code
  const statusCode = (err as any).statusCode || 500;

  // Generic server error → 500
  return c.json(
    {
      success: false,
      error: {
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
        code: (err as any).code,
        eventId: Sentry.lastEventId(), // Include Sentry event ID for tracking
      },
    },
    statusCode,
  );
}
