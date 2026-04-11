import { Hono } from "hono";
import { prisma } from "@applyai/db";

export const healthRoutes = new Hono();

const startTime = Date.now();

// GET /health — used by Docker HEALTHCHECK, Nginx, UptimeRobot
healthRoutes.get("/", async (c) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  let dbStatus: "connected" | "unreachable" = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    // db down — still return degraded so caller knows we're alive
  }

  const healthy = dbStatus === "connected";

  return c.json(
    {
      status: healthy ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.0.0",
      env: process.env.NODE_ENV ?? "development",
      uptime: `${uptimeSeconds}s`,
      memory: `${memMB}MB`,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
    healthy ? 200 : 503
  );
});

// GET /health/ping — no DB check, for load balancer TCP probes
healthRoutes.get("/ping", (c) => c.text("pong"));