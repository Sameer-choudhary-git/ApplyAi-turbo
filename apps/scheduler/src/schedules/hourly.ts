import cron from "node-cron";

import { scheduleExtraction } from "../jobs/extract.job";
import { scheduleQueueUsers } from "../jobs/queueUsers.job";

cron.schedule("0 * * * *", async () => {
    try {
        await scheduleExtraction();
        await scheduleQueueUsers();
        
    } catch (error) {
        console.error(error);
    }
});
