import { prisma } from "@applyai/db";
import { ApplyUnstopInternshipsJob } from "../../../../../packages/jobs/src/apply";
export class EligibilityService {
  async queueEligibleUsers() {
    const now = new Date();

    const users = await prisma.users.findMany({
      where: {
        preferences: {
          is: {
            autoApply: true,
          },
        },

        OR: [
          { isUnstopInternshipEnabled: true },
          { isCommudleEventEnabled: true },
        ],
      },

      include: {
        preferences: true,
        skills: true,
        platformSessions: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (users.length === 0) {
      console.log("No eligible users found.");
      return;
    }

    await Promise.all(
      users.map((user) =>
        new ApplyUnstopInternshipsJob({
          userId: user.id,
        }).enqueue(),
      ),
    );
  }
}
