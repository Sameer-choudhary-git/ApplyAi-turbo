import {
  captureException,
  addErrorBreadcrumb,
  startErrorTransaction,
} from "./ErrorTrackingManager";
import { SeverityLevel } from "./types";

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName?: string
): T {
  return (async (...args: any[]) => {
    const name = operationName || fn.name || "async_operation";

    try {
      addErrorBreadcrumb({
        message: `Started: ${name}`,
        category: "operation",
        level: "info",
      });

      const result = await fn(...args);

      addErrorBreadcrumb({
        message: `Completed: ${name}`,
        category: "operation",
        level: "info",
      });

      return result;
    } catch (error) {
      captureException(error, {
        operation_name: name,
      });
      throw error;
    }
  }) as T;
}

/**
 * Track API request with error handling
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
  addErrorBreadcrumb({
    message: `${details.method} ${details.path}`,
    category: "http",
    level: details.statusCode && details.statusCode >= 400 ? "warning" : "info",
    data: {
      method: details.method,
      path: details.path,
      status: details.statusCode,
      duration_ms: details.duration,
      user_id: details.userId,
      request_id: details.requestId,
    },
  });

  if (details.error) {
    captureException(details.error, {
      http_method: details.method,
      http_path: details.path,
      http_status: String(details.statusCode || 0),
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
  addErrorBreadcrumb({
    message: `${details.operation}${details.table ? ` on ${details.table}` : ""}`,
    category: "database",
    level: details.error ? "error" : "info",
    data: {
      operation: details.operation,
      table: details.table,
      duration_ms: details.duration,
      rows_affected: details.rowsAffected,
    },
  });

  if (details.error) {
    captureException(details.error, {
      db_operation: details.operation,
      db_table: details.table || "unknown",
    });
  }
}

/**
 * Track job execution
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

  addErrorBreadcrumb({
    message: `Job ${details.status}: ${details.jobName}`,
    category: "job",
    level: levelMap[details.status],
    data: {
      job_id: details.jobId,
      job_name: details.jobName,
      duration_ms: details.duration,
      ...details.metadata,
    },
  });

  if (details.error) {
    captureException(details.error, {
      job_id: details.jobId,
      job_name: details.jobName,
      job_status: details.status,
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

  addErrorBreadcrumb({
    message: `Cron ${details.status}: ${details.jobName} (${details.schedule})`,
    category: "cron",
    level: levelMap[details.status],
    data: {
      cron_name: details.jobName,
      cron_schedule: details.schedule,
      duration_ms: details.duration,
      ...details.metadata,
    },
  });

  if (details.error) {
    captureException(details.error, {
      cron_name: details.jobName,
      cron_status: details.status,
    });
  }
}

/**
 * Create a transaction for tracking operations
 */
export async function trackTransaction<T>(
  name: string,
  fn: (transaction: any) => Promise<T>,
  options?: {
    op?: string;
    description?: string;
    tags?: Record<string, string>;
  }
): Promise<T> {
  const transaction = startErrorTransaction({
    name,
    op: options?.op || "operation",
    description: options?.description,
    tags: options?.tags,
  });

  try {
    const result = await fn(transaction);
    transaction.setStatus("ok");
    return result;
  } catch (error) {
    transaction.setStatus("error");
    captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Extract error information
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
} {
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

export default {
  withErrorTracking,
  trackApiRequest,
  trackDatabase,
  trackJob,
  trackCronJob,
  trackTransaction,
  extractErrorInfo,
};
