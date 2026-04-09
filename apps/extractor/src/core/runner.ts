import { extractors } from "./registry";
import { prisma } from "@applyai/db";

export async function runAllExtractors() {
  for (const extractor of extractors) {
    const currentPlatform = extractor.platform;
    const currentCategory = extractor.category;
    const dbTable = `${currentPlatform}_${currentCategory}`;
    const data = await extractor.run();
    for (const item of data) {
      await (prisma as any)[dbTable].create({ data: item });
    }
  }
}
