// Re-export Node.js implementation
export * from "./node.js";

// Re-export browser implementation
// NOTE: source file is browser.tsx (contains JSX), compiled output is still .js
export * from "./browser.js";

// Re-export utilities
export * from "./utils.js";

// Configuration utilities
export interface SentryConfig {
  dsn: string;
  environment: string;
  debug?: boolean;
}

/**
 * Get Sentry DSN from environment
 */
export function getSentryDSN(): string {
  return (
    process.env.SENTRY_DSN ||
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SENTRY_DSN : "") ||
    ""
  );
}

/**
 * Get environment from configuration
 */
export function getEnvironment(): string {
  return (
    process.env.NODE_ENV ||
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.MODE : "") ||
    "development"
  );
}

/**
 * Create Sentry config object from environment
 */
export function createSentryConfig(overrides?: Partial<SentryConfig>): SentryConfig {
  return {
    dsn: getSentryDSN(),
    environment: getEnvironment(),
    debug: process.env.NODE_ENV === "development",
    ...overrides,
  };
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return !!getSentryDSN();
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === "production";
}