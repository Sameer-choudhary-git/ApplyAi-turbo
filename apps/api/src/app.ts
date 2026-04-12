import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { envConfig } from "@applyai/config";

import { authRoutes } from "./routes/auth.js";
import  userRoutes  from "./routes/user.js";
import { jobRoutes } from "./routes/jobs.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./middleware/error.js";
import resume from './routes/resume';
import { unstopSessionRouter } from './routes/unstop-session';
import { userFlagsRouter } from './routes/user-flags';
import { preferencesRouter } from './routes/preferences';
export const app = new Hono();

// ── Global middleware ──────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Log startup info
if (envConfig.isDevelopment) {
  console.log(`🚀 Running in ${envConfig.environment} mode`);
}

// ── Routes ─────────────────────────────────────────────────
app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/jobs", jobRoutes);
app.route('/api/resume', resume);
app.route('/api/sessions/unstop', unstopSessionRouter);
app.route('/api/users/me/flags', userFlagsRouter);
app.route('/api/sessions/unstop', unstopSessionRouter);
app.route('/api/auth/flags', userFlagsRouter); 
app.route('/api/users/me/preferences', preferencesRouter);
// ── 404 ────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

// ── Global error handler ───────────────────────────────────
app.onError(errorHandler);