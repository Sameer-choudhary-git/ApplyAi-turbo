import { GreenhouseDiscoveryJob } from "@applyai/jobs";
import { scheduleWithSentry } from "../lib/sentryScheduler";

export function startGreenhouseDiscoveryScheduler() {
  scheduleWithSentry({
    name: "Greenhouse Discovery",
    schedule: process.env.GREENHOUSE_DISCOVERY_CRON || "15 2 * * *",
    task: async () => {
      await new GreenhouseDiscoveryJob().enqueue();
    },
  });
}
