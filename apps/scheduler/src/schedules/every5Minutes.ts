import { scheduleWithSentry } from "../lib/sentryScheduler";

import { enqueueDueJobSkillRuns } from "../job-skill";

export function startEveryFiveMinuteScheduler() {
  scheduleWithSentry({
    name: "Every 5-Minute Task",
    schedule: "*/5 * * * *", // Every 5 minutes
    task: async () => {
      await enqueueDueJobSkillRuns();
    },
  });
}
