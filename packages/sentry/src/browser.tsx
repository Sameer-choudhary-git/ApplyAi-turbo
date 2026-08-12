import * as Sentry from "@sentry/react";
import React from "react";

export interface SentryBrowserConfig {
  dsn: string;
  environment: string;
  debug?: boolean;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  beforeSend?: (event: Sentry.ErrorEvent) => Sentry.ErrorEvent | null;
  /**
   * Optional React Router v6 bindings for route-based transaction naming.
   *
   * NOTE (Sentry v8+): `reactRouterV6Instrumentation` and the `routingInstrumentation`
   * option on BrowserTracing were removed in Sentry v8. Route-based tracing in v8+
   * requires wrapping your router with `Sentry.wrapCreateBrowserRouter` or using
   * `Sentry.reactRouterV6BrowserTracingIntegration` from `@sentry/react`. This field
   * is kept for backward-compatibility but is not used in the integration setup.
   * See: https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/
   */
  reactRouter?: {
    useEffect: typeof React.useEffect;
    useLocation: any;
    useNavigationType: any;
    createRoutesFromChildren: any;
    matchRoutes: any;
  };
}

/**
 * Initialize Sentry for Browser/React applications
 * Should be called at the very start of your application before rendering
 */
export function initSentryBrowser(config: SentryBrowserConfig): void {
  if (!config.dsn) {
    console.warn("⚠️  Sentry DSN not provided. Error reporting disabled.");
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    debug: config.debug ?? false,

    // Performance Monitoring
    // tracePropagationTargets controls which outgoing requests receive tracing headers.
    tracePropagationTargets: ["localhost", /^\//, /^https:\/\/.*\.(?:apply-ai|example\.com)\/api/],
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: config.tracesSampleRate ?? 1.0,
    replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.1, // 10% of sessions
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0, // 100% of errors

    // Custom before send for filtering/redacting sensitive data
    beforeSend: (event, hint) => {
      // Redact sensitive headers and query params
      if (event.request) {
        if (event.request.headers) {
          event.request.headers["Authorization"] = "[REDACTED]";
          event.request.headers["Cookie"] = "[REDACTED]";
        }
        if (event.request.url) {
          event.request.url = event.request.url.replace(
            /([?&](token|apikey|password|secret)=)[^&]*/gi,
            "$1[REDACTED]"
          );
        }
      }

      // Redact breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data) {
            const redacted = { ...crumb.data };
            ["password", "token", "apiKey", "secret"].forEach((key) => {
              if (redacted[key]) redacted[key] = "[REDACTED]";
            });
            return { ...crumb, data: redacted };
          }
          return crumb;
        });
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
      "originalCreateNotification",
      "canvas.contentDocument",
      // Network errors that are often noise
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      // ResizeObserver loop errors (common in browsers)
      "ResizeObserver loop limit exceeded",
      // Random plugins/extensions
      "chrome-extension://",
      "moz-extension://",
    ],
  });

  console.log(
    `✅ Sentry initialized for Browser in ${config.environment} environment`
  );
}

/**
 * Capture an exception with Sentry.
 * FIX: previously called Sentry.captureException twice when `context` was
 * provided. Now returns from within the scoped branch so it only fires once.
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): string {
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
 * Add breadcrumb for better error context
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category?: string,
  level?: Sentry.SeverityLevel
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    category: category ?? "user-action",
    level: level ?? "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Higher-Order Component to wrap React components with Sentry error boundary
 */
export const withSentryErrorBoundary = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions?: Parameters<typeof Sentry.withErrorBoundary>[1]
) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#f8f9fa",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "10px", color: "#333" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            We've been notified about the issue and are looking into it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    ),
    ...errorBoundaryOptions,
  });
};

/**
 * Error Boundary Component for wrapping parts of your app
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * React hook to capture exceptions
 */
export function useSentryError(): (error: Error | unknown) => void {
  return (error: Error | unknown) => {
    captureException(error);
  };
}

/**
 * React hook to add breadcrumbs
 */
export function useSentryBreadcrumb() {
  return (message: string, data?: Record<string, any>, level: Sentry.SeverityLevel = "info") => {
    addBreadcrumb(message, data, "react-hook", level);
  };
}

/**
 * React hook to set user context
 */
export function useSetSentryUser() {
  return (user: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  } | null) => {
    if (user) {
      setUserContext(user);
    } else {
      clearUserContext();
    }
  };
}

export default Sentry;export interface SentryConfig {
  dsn: string;
  environment: string;
  debug?: boolean;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

type BrowserEnv = Record<string, string | undefined>;

function getBrowserEnv(): BrowserEnv {
  return ((import.meta as ImportMeta & { env?: BrowserEnv }).env ?? {});
}

export function getSentryDSN(): string {
  const env = getBrowserEnv();
  return env.VITE_SENTRY_DSN ?? env.SENTRY_DSN ?? (typeof process !== "undefined" ? process.env.SENTRY_DSN : undefined) ?? "";
}

export function getEnvironment(): string {
  const env = getBrowserEnv();
  return env.VITE_APP_ENV ?? env.MODE ?? (typeof process !== "undefined" ? process.env.NODE_ENV : undefined) ?? "development";
}

export function isSentryEnabled(): boolean {
  const env = getBrowserEnv();
  return env.VITE_ENABLE_SENTRY === "true" && Boolean(getSentryDSN());
}

export function isProduction(): boolean {
  return getEnvironment() === "production";
}

export function createSentryConfig(overrides: Partial<SentryConfig> = {}): SentryConfig {
  return {
    dsn: getSentryDSN(),
    environment: getEnvironment(),
    debug: getEnvironment() !== "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1,
    ...overrides,
  };
}
