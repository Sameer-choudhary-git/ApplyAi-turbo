import { QueueEligibleUsersJob } from "@applyai/jobs";
import { scheduleWithSentry } from "../lib/sentryScheduler";

export function startHourlyScheduler() {
  scheduleWithSentry({
    name: "Hourly User Queue",
    schedule: "0 * * * *", // Every hour at the top of the hour
    task: async () => {
      await new QueueEligibleUsersJob().enqueue();
    },
  });
}
