import { prisma } from "@applyai/db";
import { applyQueue } from "@applyai/queue";
import { isNewDay } from "./utils";

export async function queueEligibleUsers() {
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

  for (const user of users) {
    try {
      // 🔥 reset daily limit
      if (!user.lastQueueReset || isNewDay(user.lastQueueReset)) {
        await prisma.users.update({
          where: { id: user.id },

          data: {
            queueCountToday: 0,
            lastQueueReset: now,
          },
        });

        user.queueCountToday = 0;
      }

      // const dailyLimit =
      //   user.preferences?.dailyApplyLimit || 10;
      const dailyLimit = 10; // default limit
      // 🔥 daily limit
      if (user.queueCountToday >= dailyLimit) {
        continue;
      }

      // 🔥 cooldown
      // if (user.lastQueuedAt) {
      //   const diffHours =
      //     (now.getTime() -
      //       user.lastQueuedAt.getTime()) /
      //     (1000 * 60 * 60);

      //   if (diffHours < 24 / dailyLimit) {
      //     continue;
      //   }
      // }

      // 🔥 enabled platforms
      const platforms: string[] = [];

      if (user.isUnstopInternshipEnabled) {
        platforms.push("unstop");
      }

      if (user.isCommudleEventEnabled) {
        platforms.push("commudle");
      }

      if (!platforms.length) {
        continue;
      }

      // 🔥 only needed cookies
      const cookies = user.platformSessions
        .filter((s) => platforms.includes(s.platform))
        .map((s) => ({
          platform: s.platform,
          cookie: s.encryptedCookie,
        }));

      if (!cookies.length) {
        continue;
      }

      // 🔥 skills
      const skills = user.skills.map(
        (s) => s.skill
      );

      // 🔥 clean payload
      const payload = {
        userId: user.id,

        platforms,

        skills,

        preferences: {
          workModes:
            user.preferences?.workModes ?? [],

          opportunityTypes:
            user.preferences
              ?.opportunityTypes ?? [],

          preferredLocations:
            user.preferences
              ?.preferredLocations ?? [],

          minStipend:
            user.preferences?.minStipend ?? 0,

          rolesOfInterest:
            user.preferences
              ?.rolesOfInterest ?? [],
        },

        cookies,
      };

      // 🔥 queue job
      await applyQueue.add(
        "apply",
        payload,
        {
          jobId: `${user.id}-${now.toDateString()}`,

          priority: 1,
        }
      );

      // 🔥 update queue metadata
      await prisma.users.update({
        where: { id: user.id },

        data: {
          lastQueuedAt: now,

          queueCountToday: {
            increment: 1,
          },
        },
      });

      console.log(`Queued user: ${user.id}`);

    } catch (err) {
      console.error(
        `Queue failed for user ${user.id}`,
        err
      );
    }
  }
}