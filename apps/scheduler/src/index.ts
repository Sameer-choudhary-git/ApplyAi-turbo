// import cron from "node-cron";
// import { runAllExtractors } from "../../../packages/core/extractor";
// import { queueEligibleUsers } from "./queueUsers";
// import { validateJobs } from "./validator";

// console.log("⏰ Scheduler started...");

// // validateJobs();
// // runAllExtractors();
// // queueEligibleUsers();

// // User Queue Scheduler (every hour, offset by 5 min)
// cron.schedule("5 * * * *", async () => {
//   console.log("📦 Queueing eligible users...");
//   try {
//     await queueEligibleUsers();
//     console.log("✅ Users queued");
//   } catch (err) {
//     console.error("❌ Queue failed:", err);
//   }
// });

import { startSchedulers } from "./app";

startSchedulers();
