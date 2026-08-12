/**
 * Abstraction layer for error tracking providers (Sentry, Datadog, Rollbar, etc.)
 * Using Strategy pattern for easy vendor swapping
 */

export type SeverityLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  service?: string;
  jobId?: string;
  jobName?: string;
  [key: string]: any;
}

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: SeverityLevel;
  data?: Record<string, any>;
  timestamp?: number;
}

export interface Transaction {
  name: string;
  op: string;
  description?: string;
  tags?: Record<string, string>;
  status?: "ok" | "error" | "cancelled" | "unknown";
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  debug?: boolean;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Core Error Tracking Strategy interface
 * Any provider must implement these methods
 */
export interface IErrorTrackingProvider {
  /**
   * Initialize the error tracking provider
   */
  initialize(config: ErrorTrackingConfig): Promise<void> | void;

  /**
   * Capture an exception
   */
  captureException(
    error: Error | unknown,
    context?: ErrorContext
  ): string | void;

  /**
   * Capture a message
   */
  captureMessage(message: string, level?: SeverityLevel, context?: ErrorContext): string | void;

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; [key: string]: any } | null): void;

  /**
   * Set custom tags for error grouping
   */
  setTags(tags: Record<string, string>): void;

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void;

  /**
   * Create a transaction for tracking operations
   */
  startTransaction(
    transaction: Transaction
  ): {
    setStatus(status: "ok" | "error"): void;
    finish(): void;
  };

  /**
   * Execute function with error context
   */
  withScope<T>(fn: (scope: any) => T | Promise<T>): T | Promise<T>;

  /**
   * Check if provider is enabled
   */
  isEnabled(): boolean;

  /**
   * Flush all pending events
   */
  close(timeout?: number): Promise<void> | void;
}

/**
 * Factory for creating error tracking provider instances
 */
export interface ErrorTrackingProviderFactory {
  create(): IErrorTrackingProvider;
}
