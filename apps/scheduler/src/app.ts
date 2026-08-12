import { startDailyScheduler } from "./schedules/daily";
import { startHourlyScheduler } from "./schedules/hourly";
import { startEveryFiveMinuteScheduler } from "./schedules/every5Minutes";

export function startSchedulers() {
  console.log("⏰ Starting all schedulers...");
  startDailyScheduler();
  startHourlyScheduler();
  startEveryFiveMinuteScheduler();
  console.log("✅ All schedulers started");
}
