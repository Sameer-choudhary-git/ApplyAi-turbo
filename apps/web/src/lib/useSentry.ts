import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import {
  captureException,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  setTags,
} from "@applyai/sentry";

/**
 * Hook to set user context in Sentry
 */
export function useSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
} | null) {
  useEffect(() => {
    if (user) {
      setUserContext(user);
    } else {
      clearUserContext();
    }
  }, [user?.id]); // Only re-run if user ID changes
}

/**
 * Hook to capture navigation events as breadcrumbs
 */
export function useSentryRouteTracking(path: string, pageName?: string) {
  useEffect(() => {
    addBreadcrumb(
      `Navigation: ${pageName || path}`,
      { path, pageName },
      "navigation"
    );

    setTags({
      current_page: pageName || path,
    });
  }, [path, pageName]);
}

/**
 * Hook to capture errors with context
 */
export function useSentryError() {
  return (error: Error | unknown, context?: string) => {
    captureException(error, {
      ui_context: context || "unknown",
    });
  };
}

/**
 * Hook to add custom breadcrumbs
 */
export function useSentryBreadcrumb() {
  return (
    message: string,
    data?: Record<string, any>,
    category?: string,
    level: Sentry.SeverityLevel = "info"
  ) => {
    addBreadcrumb(message, data, category || "user-action", level);
  };
}

/**
 * Hook to track user interactions as breadcrumbs
 */
export function useSentryInteraction(eventName: string) {
  return (metadata?: Record<string, any>) => {
    addBreadcrumb(
      `User interaction: ${eventName}`,
      metadata,
      "user-interaction",
      "info"
    );
  };
}

/**
 * Hook to measure component performance
 */
export function useSentryPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (duration > 1000) {
        // Log if component took more than 1 second to render
        addBreadcrumb(
          `Slow component render: ${componentName}`,
          {
            duration_ms: Math.round(duration),
            component: componentName,
          },
          "performance",
          "warning"
        );
      }
    };
  }, [componentName]);
}

/**
 * Hook for async operations with error tracking
 */
export function useSentryAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[] = [],
  operationName?: string
) {
  useEffect(() => {
    const execute = async () => {
      try {
        const name = operationName || asyncFn.name || "async_operation";
        const startTime = performance.now();

        addBreadcrumb(`Started: ${name}`, {}, "async", "info");

        const result = await asyncFn();

        const duration = performance.now() - startTime;
        addBreadcrumb(`Completed: ${name}`, { duration_ms: Math.round(duration) }, "async", "info");

        return result;
      } catch (error) {
        captureException(error, {
          operation_name: operationName || asyncFn.name,
        });
        throw error;
      }
    };

    execute();
  }, dependencies);
}

export default {
  useSentryUser,
  useSentryRouteTracking,
  useSentryError,
  useSentryBreadcrumb,
  useSentryInteraction,
  useSentryPerformance,
  useSentryAsync,
};
