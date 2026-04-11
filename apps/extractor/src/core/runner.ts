import { extractors } from "./registry";
import { prisma } from "@applyai/db";

export async function runAllExtractors() {
  for (const extractor of extractors) {
    const currentPlatform = extractor.platform;
    const currentCategory = extractor.category;
    const dbTable = `${currentPlatform}_${currentCategory}`;


    const data = await extractor.run();

    if (data.length === 0) {
      console.log(`⚠️  No data returned for [${dbTable}], skipping.`);
      continue;
    }

    const result = await (prisma as any)[dbTable].createMany({
      data: data,
      skipDuplicates: true,
    });

    console.log(
      `✅ [${dbTable}] ${result.count} new records inserted, ${data.length - result.count} duplicates skipped.`
    );
  }
}