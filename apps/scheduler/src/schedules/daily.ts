import cron from "node-cron";

import {
  ExtractUnstopInternshipsJob,
  ExtractCommudleJob,
  UnstopValidationJob,
} from "@applyai/jobs";

export function startDailyScheduler() {
  cron.schedule("0 2 * * *", async () => {
    console.log("Starting daily extraction...");

    try {
      await Promise.all([
        new ExtractUnstopInternshipsJob().enqueue(),
        new ExtractCommudleJob().enqueue(),
        new UnstopValidationJob().enqueue(),
      ]);

      console.log("Daily extraction jobs queued.");
    } catch (error) {
      console.error("Failed to queue daily extraction jobs:", error);
    }
  });
}
