import { prisma } from "@applyai/db";
import { applyQueue } from "@applyai/queue";
import { isNewDay } from "./utils";
export async function queueEligibleUsers() {
  const now = new Date();

  const users = await prisma.users.findMany({
    where: {
      OR: [
        { isUnstopInternshipEnabled: true },
        { isCommudleEventEnabled: true }
      ]
    }
  });

  for (const user of users) {
    // 🔁 Reset daily counter if new day
    if (!user.lastQueueReset || isNewDay(user.lastQueueReset)) {
      await prisma.users.update({
        where: { id: user.id },
        data: {
          queueCountToday: 0,
          lastQueueReset: now
        }
      });

      user.queueCountToday = 0;
    }

    // ❌ already reached daily limit
    if (user.queueCountToday >= 3) continue;

    // ❌ recently queued
    if (user.lastQueuedAt) {
      const diffHours =
        (now.getTime() - user.lastQueuedAt.getTime()) / (1000 * 60 * 60);

      if (diffHours < 6) continue;
    }

    // ✅ enqueue job
    await applyQueue.add("apply", {
      userId: user.id
    });

    // ✅ update state
    await prisma.users.update({
      where: { id: user.id },
      data: {
        lastQueuedAt: now,
        queueCountToday: {
          increment: 1
        }
      }
    });

    console.log(`Queued user: ${user.id}`);
  }
}

