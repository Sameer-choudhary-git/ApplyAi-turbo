import * as Sentry from "@sentry/node";

/**
 * Utility type for Sentry context
 */
export interface SentryContext {
  userId?: string;
  requestId?: string;
  service?: string;
  jobId?: string;
  jobName?: string;
  [key: string]: any;
}

/**
 * Enhanced error information for better tracking
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
  context?: SentryContext;
  tags?: Record<string, string>;
  originalError?: Error;
}

/**
 * Create a properly formatted error for Sentry with full context
 */
export function createSentryError(info: ErrorInfo): { error: Error; eventId: string } {
  return Sentry.withScope((scope) => {
    // Add context
    if (info.context) {
      Object.entries(info.context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          scope.setContext(key, { value });
        }
      });
    }

    // Add tags
    if (info.tags) {
      Object.entries(info.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Add extra metadata
    scope.setContext("error_info", {
      code: info.code,
      statusCode: info.statusCode,
      timestamp: new Date().toISOString(),
    });

    const error = info.originalError || new Error(info.message);
    const eventId = Sentry.captureException(error) as string;

    return { error, eventId };
  });
}

/**
 * Wrap an async function with Sentry error tracking
 */
export function withSentryTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    name?: string;
    tags?: Record<string, string>;
    context?: SentryContext;
  }
): T {
  return (async (...args: any[]) => {
    const fnName = options?.name || fn.name || "anonymous";

    return Sentry.withScope(async (scope) => {
      scope.setTag("function", fnName);

      if (options?.tags) {
        Object.entries(options.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (options?.context) {
        Object.entries(options.context).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            scope.setContext(key, { value });
          }
        });
      }

      try {
        return await fn(...args);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }) as T;
}

/**
 * Wrap a synchronous function with Sentry error tracking
 */
export function withSentryTrackingSync<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    name?: string;
    tags?: Record<string, string>;
    context?: SentryContext;
  }
): T {
  return ((...args: any[]) => {
    const fnName = options?.name || fn.name || "anonymous";

    return Sentry.withScope((scope) => {
      scope.setTag("function", fnName);

      if (options?.tags) {
        Object.entries(options.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (options?.context) {
        Object.entries(options.context).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            scope.setContext(key, { value });
          }
        });
      }

      try {
        return fn(...args);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }) as T;
}

/**
 * Create a Sentry transaction for tracking operations
 */
export async function trackTransaction<T>(
  name: string,
  fn: (transaction: Sentry.Transaction) => Promise<T>,
  options?: {
    op?: string;
    description?: string;
    tags?: Record<string, string>;
  }
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name: name,
    op: options?.op || "operation",
    description: options?.description,
  });

  if (options?.tags) {
    Object.entries(options.tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }

  try {
    const result = await fn(transaction);
    transaction.setStatus("ok");
    return result;
  } catch (error) {
    transaction.setStatus("error");
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Add structured breadcrumbs to track user actions and events
 */
export function addTraceBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info"
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    level,
    category: "trace",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track API request details
 */
export function trackApiRequest(details: {
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  userId?: string;
  requestId?: string;
}): void {
  Sentry.addBreadcrumb({
    category: "http",
    message: `${details.method} ${details.path}`,
    level: details.statusCode && details.statusCode >= 400 ? "warning" : "info",
    data: {
      method: details.method,
      path: details.path,
      status: details.statusCode,
      duration_ms: details.duration,
      user_id: details.userId,
      request_id: details.requestId,
    },
    timestamp: Date.now() / 1000,
  });

  if (details.error) {
    Sentry.captureException(details.error, {
      tags: {
        http_method: details.method,
        http_path: details.path,
        http_status: String(details.statusCode || 0),
      },
    });
  }
}

/**
 * Track database operation
 */
export function trackDatabase(details: {
  operation: string;
  table?: string;
  duration?: number;
  error?: Error;
  rowsAffected?: number;
}): void {
  Sentry.addBreadcrumb({
    category: "database",
    message: `${details.operation}${details.table ? ` on ${details.table}` : ""}`,
    level: details.error ? "error" : "info",
    data: {
      operation: details.operation,
      table: details.table,
      duration_ms: details.duration,
      rows_affected: details.rowsAffected,
    },
    timestamp: Date.now() / 1000,
  });

  if (details.error) {
    Sentry.captureException(details.error, {
      tags: {
        db_operation: details.operation,
        db_table: details.table || "unknown",
      },
    });
  }
}

/**
 * Track job processing
 */
export function trackJob(details: {
  jobId: string;
  jobName: string;
  status: "started" | "completed" | "failed" | "retried";
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}): void {
  const levelMap = {
    started: "info",
    completed: "info",
    failed: "error",
    retried: "warning",
  } as const;

  Sentry.addBreadcrumb({
    category: "job",
    message: `Job ${details.status}: ${details.jobName}`,
    level: levelMap[details.status],
    data: {
      job_id: details.jobId,
      job_name: details.jobName,
      duration_ms: details.duration,
      ...details.metadata,
    },
    timestamp: Date.now() / 1000,
  });

  if (details.error) {
    Sentry.captureException(details.error, {
      tags: {
        job_id: details.jobId,
        job_name: details.jobName,
        job_status: details.status,
      },
    });
  }
}

/**
 * Track cron job execution
 */
export function trackCronJob(details: {
  jobName: string;
  schedule: string;
  status: "started" | "completed" | "failed";
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}): void {
  const levelMap = {
    started: "info",
    completed: "info",
    failed: "error",
  } as const;

  Sentry.addBreadcrumb({
    category: "cron",
    message: `Cron ${details.status}: ${details.jobName} (${details.schedule})`,
    level: levelMap[details.status],
    data: {
      cron_name: details.jobName,
      cron_schedule: details.schedule,
      duration_ms: details.duration,
      ...details.metadata,
    },
    timestamp: Date.now() / 1000,
  });

  if (details.error) {
    Sentry.captureException(details.error, {
      tags: {
        cron_name: details.jobName,
        cron_status: details.status,
      },
    });
  }
}

/**
 * Extract error message and code from various error types
 */
export function extractErrorInfo(error: unknown): { message: string; code?: string; statusCode?: number } {
  if (error instanceof Error) {
    const code = (error as any).code;
    const statusCode = (error as any).statusCode || (error as any).status;
    return {
      message: error.message,
      code,
      statusCode,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (typeof error === "object" && error !== null) {
    return {
      message: (error as any).message || "Unknown error",
      code: (error as any).code,
      statusCode: (error as any).statusCode || (error as any).status,
    };
  }

  return { message: String(error) };
}

/**
 * Create a standardized error object
 */
export function createErrorObject(
  message: string,
  code?: string,
  statusCode?: number
): Error & { code?: string; statusCode?: number } {
  const error = new Error(message);
  if (code) (error as any).code = code;
  if (statusCode) (error as any).statusCode = statusCode;
  return error as Error & { code?: string; statusCode?: number };
}

export default {
  createSentryError,
  withSentryTracking,
  withSentryTrackingSync,
  trackTransaction,
  addTraceBreadcrumb,
  trackApiRequest,
  trackDatabase,
  trackJob,
  trackCronJob,
  extractErrorInfo,
  createErrorObject,
};
