import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { initializeRedis } from "./lib/cache.js";

const PORT = Number(process.env.PORT) || 3000;

// Initialize Redis before starting the server
initializeRedis().catch((err) => {
  console.error("Failed to initialize Redis:", err);
  console.log("⚠️  Continuing without Redis cache...");
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
