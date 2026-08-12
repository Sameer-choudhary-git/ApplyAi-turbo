import React from "react";
import { ErrorBoundary as SentryErrorBoundary } from "@applyai/sentry";

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDetails?: boolean;
  componentName?: string;
}

/**
 * Wrapper for Sentry Error Boundary with custom fallback UI
 */
export function ErrorBoundaryWrapper({
  children,
  fallback,
  showDetails = false,
  componentName = "Component",
}: ErrorBoundaryWrapperProps) {
  const defaultFallback = (
    <div
      className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800"
      role="alert"
    >
      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
        Error in {componentName}
      </h3>
      <p className="text-sm text-red-800 dark:text-red-200">
        Something went wrong. Please try refreshing the page.
      </p>
      {showDetails && (
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-3 py-1 text-sm bg-red-200 dark:bg-red-900 hover:bg-red-300 dark:hover:bg-red-800 text-red-900 dark:text-red-100 rounded"
        >
          Reload
        </button>
      )}
    </div>
  );

  return (
    <SentryErrorBoundary fallback={fallback || defaultFallback}>
      {children}
    </SentryErrorBoundary>
  );
}

export default ErrorBoundaryWrapper;
