import cronParser from "cron-parser";
import { prisma } from "@applyai/db";
import { JobSkillSearchJob } from "@applyai/jobs";

function record(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, any> : {};
}

function nextRun(cronExpression: string, timezone: string): Date {
  try {
    const expression = (cronParser as any).parseExpression(cronExpression, { tz: timezone, currentDate: new Date() });
    return expression.next().toDate();
  } catch {
    return new Date(Date.now() + 15 * 60 * 1000);
  }
}

export async function enqueueDueJobSkillRuns(): Promise<void> {
  const now = new Date();
  const schedules = await prisma.job_skill_schedules.findMany({
    where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    include: { user: { include: { preferences: true, education: true, experience: true, skills: true } } },
    take: 100,
  });

  for (const schedule of schedules) {
    const entitlement = await prisma.user_entitlements.findFirst({
      where: { userId: schedule.userId, status: "active", startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }], tier: { is: { isActive: true } } },
      include: { tier: true },
      orderBy: { startsAt: "desc" },
    });
    const features = record(entitlement?.featuresSnapshot ?? entitlement?.tier.features);
    if (!entitlement || features.job_skill_schedule !== true) {
      await prisma.job_skill_schedules.update({ where: { id: schedule.id }, data: { nextRunAt: nextRun(schedule.cronExpression, schedule.timezone) } });
      continue;
    }

    const dateKey = now.toISOString().slice(0, 10);
    const idempotencyKey = `nightly:${schedule.id}:${dateKey}`;
    const configuration = { roles: schedule.roles, locations: schedule.locations, providerKeys: schedule.providerKeys, companyTypes: schedule.companyTypes, seniority: schedule.seniority, salaryMin: schedule.salaryMin, salaryMax: schedule.salaryMax, maxResults: schedule.maxResults, materialLimit: schedule.materialLimit };
    try {
      const run = await prisma.job_skill_runs.create({
        data: {
          userId: schedule.userId,
          triggerType: "nightly",
          status: "queued",
          idempotencyKey,
          configurationHash: JSON.stringify(configuration),
          profileSnapshot: { fullName: schedule.user.fullName, location: schedule.user.location, bio: schedule.user.bio, linkedinUrl: schedule.user.linkedinUrl, githubUrl: schedule.user.githubUrl, resumeUrl: schedule.user.resumeUrl, education: schedule.user.education, experience: schedule.user.experience, skills: schedule.user.skills.map((skill) => skill.skill) },
          preferencesSnapshot: { ...record(schedule.user.preferences), ...configuration },
          entitlementSnapshot: { tierKey: entitlement.tier.key, features: entitlement.featuresSnapshot, limits: entitlement.limitsSnapshot },
        },
      });
      await new JobSkillSearchJob({ runId: run.id, userId: schedule.userId }).enqueue({ attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 });
      await prisma.job_skill_schedules.update({ where: { id: schedule.id }, data: { lastRunAt: now, nextRunAt: nextRun(schedule.cronExpression, schedule.timezone) } });
    } catch (error) {
      // A duplicate idempotency key means another scheduler tick already won.
      if (!(error instanceof Error && /unique|P2002/i.test(error.message))) console.error(`[job-skill] failed to enqueue schedule ${schedule.id}:`, error);
      await prisma.job_skill_schedules.update({ where: { id: schedule.id }, data: { nextRunAt: nextRun(schedule.cronExpression, schedule.timezone) } });
    }
  }
}
