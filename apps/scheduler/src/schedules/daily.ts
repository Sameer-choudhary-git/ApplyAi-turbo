import {
  ExtractUnstopInternshipsJob,
  ExtractCommudleJob,
  UnstopValidationJob,
} from "@applyai/jobs";
import { scheduleWithSentry } from "../lib/sentryScheduler";

export function startDailyScheduler() {
  scheduleWithSentry({
    name: "Daily Extraction",
    schedule: "0 2 * * *", // 2 AM daily
    task: async () => {
      await Promise.all([
        new ExtractUnstopInternshipsJob().enqueue(),
        new ExtractCommudleJob().enqueue(),
        new UnstopValidationJob().enqueue(),
      ]);
    },
  });
}
