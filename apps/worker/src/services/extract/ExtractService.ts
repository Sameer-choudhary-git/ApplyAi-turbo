import { prisma } from "@applyai/db";
import { unstopInternships } from "@applyai/extractor";

export class ExtractService {
  async extractUnstopInternships() {
    const internships = await unstopInternships.run();
    const dbTable = `unstop_internships`;
    if (internships.length === 0) {
      console.log(`⚠️  No data returned for [${dbTable}], skipping.`);
      return;
    }
    const result = await (prisma as any)[dbTable].createMany({
      data: internships,
      skipDuplicates: true,
    });
    console.log(
      `✅ [${dbTable}] ${result.count} new records inserted, ${internships.length - result.count} duplicates skipped.`,
    );
  }

  async extractCommudleEvents() {}
}
