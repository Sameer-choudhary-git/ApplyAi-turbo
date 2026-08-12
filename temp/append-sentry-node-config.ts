export function getSentryDSN(): string {
  return process.env.SENTRY_DSN ?? "";
}

export function getEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
}

export function isSentryEnabled(): boolean {
  const dsn = getSentryDSN();
  const explicitFlag = process.env.ENABLE_SENTRY ?? process.env.SENTRY_ENABLED;
  return Boolean(dsn) && (explicitFlag === undefined || explicitFlag === "true");
}
