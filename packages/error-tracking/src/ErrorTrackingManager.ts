import {
  IErrorTrackingProvider,
  ErrorTrackingConfig,
  ErrorContext,
  Breadcrumb,
  Transaction,
  SeverityLevel,
} from "./types";
import { SentryStrategy } from "./strategies/SentryStrategy";
import { NullStrategy } from "./strategies/NullStrategy";

/**
 * Error Tracking Manager using Strategy pattern
 * Manages a pluggable error tracking provider
 * Can be easily switched between Sentry, Datadog, Rollbar, etc.
 */
export class ErrorTrackingManager {
  private static instance: ErrorTrackingManager;
  private provider: IErrorTrackingProvider;
  private config: ErrorTrackingConfig;

  private constructor(provider: IErrorTrackingProvider) {
    this.provider = provider;
    this.config = {
      enabled: false,
      dsn: "",
      environment: "development",
    };
  }

  /**
   * Get singleton instance of ErrorTrackingManager
   */
  static getInstance(provider?: IErrorTrackingProvider): ErrorTrackingManager {
    if (!ErrorTrackingManager.instance) {
      ErrorTrackingManager.instance = new ErrorTrackingManager(
        provider || new NullStrategy()
      );
    }
    return ErrorTrackingManager.instance;
  }

  /**
   * Initialize error tracking with configuration
   */
  async initialize(config: ErrorTrackingConfig): Promise<void> {
    this.config = config;
    await this.provider.initialize(config);
  }

  /**
   * Switch to a different error tracking provider
   * Useful for runtime provider changes
   */
  async switchProvider(newProvider: IErrorTrackingProvider, config?: ErrorTrackingConfig): Promise<void> {
    // Close the old provider
    await this.provider.close();

    // Set the new provider
    this.provider = newProvider;

    // Initialize the new provider
    if (config) {
      await this.initialize(config);
    } else {
      await this.provider.initialize(this.config);
    }

    console.log(`✅ Switched error tracking provider`);
  }

  /**
   * Capture an exception
   */
  captureException(error: Error | unknown, context?: ErrorContext): string | void {
    return this.provider.captureException(error, context);
  }

  /**
   * Capture a message
   */
  captureMessage(
    message: string,
    level?: SeverityLevel,
    context?: ErrorContext
  ): string | void {
    return this.provider.captureMessage(message, level, context);
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; [key: string]: any } | null): void {
    this.provider.setUser(user);
  }

  /**
   * Set custom tags
   */
  setTags(tags: Record<string, string>): void {
    this.provider.setTags(tags);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.provider.addBreadcrumb(breadcrumb);
  }

  /**
   * Start a transaction
   */
  startTransaction(transaction: Transaction): {
    setStatus(status: "ok" | "error"): void;
    finish(): void;
  } {
    return this.provider.startTransaction(transaction);
  }

  /**
   * Execute function with scope context
   */
  async withScope<T>(fn: (scope: any) => T | Promise<T>): Promise<T> {
    return this.provider.withScope(fn);
  }

  /**
   * Check if error tracking is enabled
   */
  isEnabled(): boolean {
    return this.provider.isEnabled();
  }

  /**
   * Get current provider
   */
  getProvider(): IErrorTrackingProvider {
    return this.provider;
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorTrackingConfig {
    return this.config;
  }

  /**
   * Close and flush all events
   */
  async close(timeout?: number): Promise<void> {
    await this.provider.close(timeout);
  }
}

/**
 * Global convenience functions
 */

export function getErrorTracker(): ErrorTrackingManager {
  return ErrorTrackingManager.getInstance();
}

export function initializeErrorTracking(config: ErrorTrackingConfig, provider?: IErrorTrackingProvider): Promise<void> {
  const tracker = ErrorTrackingManager.getInstance(provider || new SentryStrategy());
  return tracker.initialize(config);
}

export function captureException(error: Error | unknown, context?: ErrorContext): string | void {
  return getErrorTracker().captureException(error, context);
}

export function captureMessage(
  message: string,
  level?: SeverityLevel,
  context?: ErrorContext
): string | void {
  return getErrorTracker().captureMessage(message, level, context);
}

export function setUserContext(user: { id?: string; email?: string; [key: string]: any } | null): void {
  getErrorTracker().setUser(user);
}

export function setErrorTags(tags: Record<string, string>): void {
  getErrorTracker().setTags(tags);
}

export function addErrorBreadcrumb(breadcrumb: Breadcrumb): void {
  getErrorTracker().addBreadcrumb(breadcrumb);
}

export function startErrorTransaction(transaction: Transaction) {
  return getErrorTracker().startTransaction(transaction);
}

export async function withErrorScope<T>(fn: (scope: any) => T | Promise<T>): Promise<T> {
  return getErrorTracker().withScope(fn);
}

export function isErrorTrackingEnabled(): boolean {
  return getErrorTracker().isEnabled();
}

export async function closeErrorTracking(timeout?: number): Promise<void> {
  return getErrorTracker().close(timeout);
}

export default ErrorTrackingManager;
