import cron from "node-cron";
import { extractUnstopInternship, extractCommudleEvents } from "../jobs/extract.job";

cron.schedule("0 0 * * *", async () => {
    try {
        await extractUnstopInternship.enqueue();
        await extractCommudleEvents.enqueue();
    } catch (error) {
        console.error(error);
    }
});
