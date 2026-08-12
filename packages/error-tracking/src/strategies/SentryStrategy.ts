import * as Sentry from "@sentry/node";
import {
  IErrorTrackingProvider,
  ErrorTrackingConfig,
  ErrorContext,
  Breadcrumb,
  Transaction,
  SeverityLevel,
} from "../types";

/**
 * Sentry implementation of the IErrorTrackingProvider strategy
 * This can be swapped out for other providers without changing consumer code
 */
export class SentryStrategy implements IErrorTrackingProvider {
  private enabled: boolean = false;

  async initialize(config: ErrorTrackingConfig): Promise<void> {
    if (!config.enabled || !config.dsn) {
      console.warn("⚠️  Error tracking disabled or DSN not provided");
      this.enabled = false;
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      debug: config.debug ?? false,
      tracesSampleRate: config.tracesSampleRate ?? 1.0,
      profilesSampleRate: config.profilesSampleRate ?? 1.0,
      integrations: [
        Sentry.httpIntegration({ spans: true }),
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration(),
      ],
      beforeSend: (event) => {
        // Redact sensitive data
        if (event.request?.headers) {
          event.request.headers["Authorization"] = "[REDACTED]";
          event.request.headers["Cookie"] = "[REDACTED]";
          event.request.headers["X-API-Key"] = "[REDACTED]";
        }
        if (event.request?.url) {
          event.request.url = event.request.url.replace(
            /([?&](token|apikey|password|secret)=)[^&]*/gi,
            "$1[REDACTED]"
          );
        }
        return event;
      },
      ignoreErrors: [
        /top\.GLOBALS/,
        "originalCreateNotification",
        "canvas.contentDocument",
        "NetworkError",
        "Network request failed",
        "Failed to fetch",
        /health|ping|heartbeat/i,
      ],
    });

    this.enabled = true;
    console.log(`✅ Sentry error tracking initialized (${config.environment})`);
  }

  captureException(error: Error | unknown, context?: ErrorContext): string | void {
    if (!this.enabled) return;

    return Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            scope.setContext(key, { value });
          }
        });
      }
      return Sentry.captureException(error) as string;
    });
  }

  captureMessage(
    message: string,
    level: SeverityLevel = "info",
    context?: ErrorContext
  ): string | void {
    if (!this.enabled) return;

    return Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            scope.setContext(key, { value });
          }
        });
      }
      return Sentry.captureMessage(message, level) as string;
    });
  }

  setUser(user: { id?: string; email?: string; [key: string]: any } | null): void {
    if (!this.enabled) return;
    Sentry.setUser(user);
  }

  setTags(tags: Record<string, string>): void {
    if (!this.enabled) return;

    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.enabled) return;

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category,
      level: breadcrumb.level,
      data: breadcrumb.data,
      timestamp: breadcrumb.timestamp,
    });
  }

  startTransaction(transaction: Transaction): {
    setStatus(status: "ok" | "error"): void;
    finish(): void;
  } {
    if (!this.enabled) {
      return {
        setStatus: () => {},
        finish: () => {},
      };
    }

    const sentryTransaction = Sentry.startInactiveSpan({
      name: transaction.name,
      op: transaction.op,
    });

    if (transaction.tags) {
      Object.entries(transaction.tags).forEach(([key, value]) => {
        sentryTransaction.setAttribute(key, value);
      });
    }

    return {
      setStatus: (status: "ok" | "error") => {
        sentryTransaction.setStatus({ code: status === "ok" ? 1 : 2 });
      },
      finish: () => {
        sentryTransaction.end();
      },
    };
  }

  async withScope<T>(fn: (scope: any) => T | Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn({});
    }

    return Sentry.withScope(fn);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async close(timeout: number = 2000): Promise<void> {
    if (!this.enabled) return;
    await Sentry.close(timeout);
  }
}

export default SentryStrategy;
