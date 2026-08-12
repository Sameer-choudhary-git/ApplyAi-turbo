import { scheduleWithSentry } from "../lib/sentryScheduler";

export function startEveryFiveMinuteScheduler() {
  scheduleWithSentry({
    name: "Every 5-Minute Task",
    schedule: "*/5 * * * *", // Every 5 minutes
    task: async () => {
      // Currently empty, add tasks as needed
      // Example: await new SomeJob().enqueue();
    },
  });
}
