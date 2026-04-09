import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/user.js";
import { jobRoutes } from "./routes/jobs.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./middleware/error.js";

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

// ── Routes ─────────────────────────────────────────────────
app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/user", userRoutes);
app.route("/api/jobs", jobRoutes);

// ── 404 ────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

// ── Global error handler ───────────────────────────────────
app.onError(errorHandler);