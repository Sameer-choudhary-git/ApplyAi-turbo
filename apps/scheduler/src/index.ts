import cron from "node-cron";
import { runAllExtractors } from "@repo/extractor";
import { queueEligibleUsers } from "./queueUsers";

console.log("⏰ Scheduler started...");

// Extractors (every 1 hour)
cron.schedule("0 * * * *", async () => {
  console.log("🚀 Running extractors...");
  try {
    await runAllExtractors();
    console.log("✅ Extractors completed");
  } catch (err) {
    console.error("❌ Extractor failed:", err);
  }
});

// User Queue Scheduler (every hour, offset by 5 min)
cron.schedule("5 * * * *", async () => {
  console.log("📦 Queueing eligible users...");
  try {
    await queueEligibleUsers();
    console.log("✅ Users queued");
  } catch (err) {
    console.error("❌ Queue failed:", err);
  }
});