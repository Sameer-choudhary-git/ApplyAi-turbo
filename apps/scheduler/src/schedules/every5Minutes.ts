import cron from "node-cron";

import { ExtractCommudleJob } from "@applyai/jobs";

export function startEveryFiveMinuteScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    console.log("Starting every 5-minute extraction...");

    try {
      await Promise.all([]);

      console.log("Every 5-minute extraction jobs queued.");
    } catch (error) {
      console.error("Failed to queue every 5-minute extraction jobs:", error);
    }
  });
}
