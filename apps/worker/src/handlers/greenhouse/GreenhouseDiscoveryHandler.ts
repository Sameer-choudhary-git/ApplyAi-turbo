import type { JobHandler } from "@applyai/queue";
import { runGreenhouseDiscovery } from "@applyai/greenhouse";

export class GreenhouseDiscoveryHandler implements JobHandler {
  async execute(): Promise<void> {
    const result = await runGreenhouseDiscovery({
      commonCrawlEnabled:
        process.env.GREENHOUSE_COMMON_CRAWL_ENABLED !== "false",
      commonCrawlLimit: Number(
        process.env.GREENHOUSE_COMMON_CRAWL_LIMIT || 200,
      ),
      workers: Number(process.env.GREENHOUSE_WORKERS || 6),
    });
    console.log(`[greenhouse] discovery completed: ${JSON.stringify(result)}`);
  }
}
