import "dotenv/config";
import * as Sentry from "@sentry/node";
import {
  initSentryNode,
  getSentryDSN,
  getEnvironment,
  isSentryEnabled,
} from "@applyai/sentry";

// Initialize Sentry FIRST
if (isSentryEnabled()) {
  initSentryNode({
    dsn: getSentryDSN(),
    environment: getEnvironment(),
    debug: process.env.NODE_ENV === "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
  console.log(`✅ Sentry initialized for Scheduler (${getEnvironment()})`);
} else {
  console.warn("⚠️  Sentry DSN not configured - error reporting disabled");
}

// Capture unhandled exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  Sentry.captureException(error, {
    tags: {
      error_type: "uncaught_exception",
      service: "scheduler",
    },
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
  Sentry.captureException(reason, {
    contexts: {
      unhandled_rejection: {
        promise: String(promise),
      },
    },
    tags: {
      error_type: "unhandled_rejection",
      service: "scheduler",
    },
  });
});

// Import and start schedulers
import { startSchedulers } from "./app";

startSchedulers();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, flushing Sentry...");
  await Sentry.close(2000);
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, flushing Sentry...");
  await Sentry.close(2000);
  process.exit(0);
});

console.log("📊 Scheduler service started");
console.log(`🔗 Sentry DSN: ${isSentryEnabled() ? "configured" : "not configured"}`);
