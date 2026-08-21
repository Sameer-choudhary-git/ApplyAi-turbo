import { startDailyScheduler } from "./schedules/daily";
import { startHourlyScheduler } from "./schedules/hourly";
import { startEveryFiveMinuteScheduler } from "./schedules/every5Minutes";
import { startGreenhouseDiscoveryScheduler } from "./schedules/greenhouseDiscovery";
import { startGreenhouseApplicationScheduler } from "./schedules/greenhouseApplications";

export function startSchedulers() {
  console.log("⏰ Starting all schedulers...");
  startDailyScheduler();
  startHourlyScheduler();
  startEveryFiveMinuteScheduler();
  startGreenhouseDiscoveryScheduler();
  startGreenhouseApplicationScheduler();

  console.log("✅ All schedulers started");
}
