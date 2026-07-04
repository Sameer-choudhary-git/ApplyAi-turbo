import { startDailyScheduler } from "./schedules/daily";
import { startHourlyScheduler } from "./schedules/hourly";
import { startEveryFiveMinuteScheduler } from "./schedules/every5Minutes";

export function startSchedulers() {
  startDailyScheduler();
  startHourlyScheduler();
  startEveryFiveMinuteScheduler();
}
