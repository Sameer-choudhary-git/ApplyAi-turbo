import cron from "node-cron";
import { QueueEligibleUsersJob } from "@applyai/jobs";

export function startHourlyScheduler() {
  cron.schedule("0 * * * *", async () => {
    console.log("Starting hourly extraction...");

    try {
      await Promise.all([await new QueueEligibleUsersJob().enqueue()]);

      console.log("Hourly extraction jobs queued.");
    } catch (error) {
      console.error("Failed to queue hourly extraction jobs:", error);
    }
  });
}
