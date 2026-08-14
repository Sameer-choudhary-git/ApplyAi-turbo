import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { envConfig } from "@applyai/config";

import { authRoutes } from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import { jobRoutes } from "./routes/jobs.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./middleware/error.js";
import { sentryContextMiddleware } from "./middleware/sentry.js";
import resume from "./routes/resume";
import { unstopSessionRouter } from "./routes/unstop-session";
import { userFlagsRouter } from "./routes/user-flags";
import { preferencesRouter } from "./routes/preferences";
import { applicationsRouter } from "./routes/applications";
import { requestLogger } from "@applyai/logger";
import tasks from "./routes/tasks";
import interviews from "./routes/interviews.js";
import scheduleRouter from "./routes/schedule.js";
import { networking } from "./routes/networking.js";
import googleCalendar from "./routes/google-calendar";
import adminJobsRouter from "./routes/admin-jobs";

const allowedOrigins = [
  "https://applyai.studio",
  "https://www.applyai.studio",
  "https://apply-ai-turbo-web.vercel.app",
  "chrome-extension://jnaodcfhebmjmkahjkanclegonmlkmhn",
  
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
];

export const app = new Hono();

// â”€â”€ Global middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sentry middleware for context and error tracking (should be early)
app.use("*", sentryContextMiddleware);

// Standard middleware
// app.use("*", logger());
app.use("*", requestLogger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return undefined;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return normalizedOrigin;
      }

      console.warn(
        `[CORS] Rejected origin: ${origin}`
      );

      return undefined;
    },

    credentials: true,

    allowMethods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// Log startup info
if (envConfig.isDevelopment) {
  console.log(`ðŸš€ Running in ${envConfig.environment} mode`);
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/jobs", jobRoutes);
app.route("/api/resume", resume);
app.route("/api/sessions/unstop", unstopSessionRouter);
app.route("/api/users/me/flags", userFlagsRouter);
app.route("/api/sessions/unstop", unstopSessionRouter);
app.route("/api/auth/flags", userFlagsRouter);
app.route("/api/users/me/preferences", preferencesRouter);
app.route("/api/applications", applicationsRouter);
app.route("/api/tasks", tasks);
app.route("/api/schedule", scheduleRouter);
app.route("/api/interviews", interviews);
app.route("/api/networking", networking);
app.route("/api/google-calendar", googleCalendar);
app.route("/api/admin/jobs", adminJobsRouter);


// â”€â”€ 404 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

// â”€â”€ Global error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.onError(errorHandler);
