import { GreenhouseApplicationSelectionJob } from "@applyai/jobs";
import { scheduleWithSentry } from "../lib/sentryScheduler";

export function startGreenhouseApplicationScheduler() {
  scheduleWithSentry({
    name: "Greenhouse Application Selection",
    schedule: process.env.GREENHOUSE_APPLICATION_CRON || "0 4 * * *",
    task: async () => {
      await new GreenhouseApplicationSelectionJob().enqueue();
    },
  });
}
