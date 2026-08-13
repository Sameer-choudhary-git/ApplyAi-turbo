import "dotenv/config";
import * as Sentry from "@sentry/node";
import { 
  initSentryNode, 
  getSentryDSN, 
  getEnvironment,
  isSentryEnabled 
} from "@applyai/sentry";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { initializeRedis } from "./lib/cache.js";

const PORT = Number(process.env.PORT || 3000);
const isDev = process.env.NODE_ENV === "development";

// Initialize Sentry FIRST before anything else
if (isSentryEnabled()) {
  initSentryNode({
    dsn: getSentryDSN(),
    environment: getEnvironment(),
    debug: isDev,
    tracesSampleRate: isDev ? 1.0 : 0.1,
    profilesSampleRate: isDev ? 1.0 : 0.1,
  });
  console.log(`âœ… Sentry initialized for API (${getEnvironment()})`);
} else {
  console.warn("âš ï¸  Sentry DSN not configured - error reporting disabled");
}

// Capture unhandled exceptions and rejections
process.on("uncaughtException", (error) => {
  console.error("âŒ Uncaught Exception:", error);
  Sentry.captureException(error, {
    tags: {
      error_type: "uncaught_exception",
    },
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("âŒ Unhandled Rejection:", reason);
  Sentry.captureException(reason, {
    contexts: {
      unhandled_rejection: {
        promise: String(promise),
      },
    },
    tags: {
      error_type: "unhandled_rejection",
    },
  });
});

// Initialize Redis before starting the server
(process.env.DISABLE_REDIS === "true" || isDev ? Promise.resolve(null) : initializeRedis())
  .then(() => {
    console.log("âœ… Redis initialized");
  })
  .catch((err) => {
    console.error("âŒ Failed to initialize Redis:", err);
    Sentry.captureException(err, {
      tags: {
        service: "redis",
        initialization: "true",
      },
    });
    console.log("âš ï¸  Continuing without Redis cache...");
  });

// Start server
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`ðŸš€ API listening on port ${PORT}`);
  console.log(`ðŸ“Š Environment: ${getEnvironment()}`);
  console.log(`ðŸ”— Sentry DSN: ${isSentryEnabled() ? "configured" : "not configured"}`);
});


