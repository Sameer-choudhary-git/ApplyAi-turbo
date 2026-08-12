import {
  IErrorTrackingProvider,
  ErrorTrackingConfig,
  ErrorContext,
  Breadcrumb,
  Transaction,
  SeverityLevel,
} from "../types";

/**
 * Null/No-op strategy for when error tracking is disabled
 * Implements the interface but does nothing - useful for development or when disabled
 */
export class NullStrategy implements IErrorTrackingProvider {
  async initialize(config: ErrorTrackingConfig): Promise<void> {
    console.log("ℹ️  Error tracking disabled - using null strategy");
  }

  captureException(error: Error | unknown, context?: ErrorContext): void {
    // Silent no-op
  }

  captureMessage(
    message: string,
    level?: SeverityLevel,
    context?: ErrorContext
  ): void {
    // Silent no-op
  }

  setUser(user: { id?: string; email?: string; [key: string]: any } | null): void {
    // Silent no-op
  }

  setTags(tags: Record<string, string>): void {
    // Silent no-op
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    // Silent no-op
  }

  startTransaction(transaction: Transaction): {
    setStatus(status: "ok" | "error"): void;
    finish(): void;
  } {
    return {
      setStatus: () => {},
      finish: () => {},
    };
  }

  async withScope<T>(fn: (scope: any) => T | Promise<T>): Promise<T> {
    return fn({});
  }

  isEnabled(): boolean {
    return false;
  }

  async close(timeout?: number): Promise<void> {
    // Silent no-op
  }
}

export default NullStrategy;
