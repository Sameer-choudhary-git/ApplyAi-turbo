import { prisma } from "@applyai/db";
import { ApplyUnstopInternshipPayload } from "@applyai/apply";
import { decrypt } from "@applyai/utils";
import { agentRegistry } from "@applyai/apply";
export class ApplyUnstopInternshipService {
  async apply(payload: ApplyUnstopInternshipPayload) {
    const { userId } = payload;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        skills: true,
        platformSessions: {
          where: {
            isActive: true,
          },
        },
        entitlements: {
          where: {
            status: "active",
            startsAt: { lte: new Date() },
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            tier: { is: { isActive: true } },
          },
          include: { tier: true },
          orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    //TODO : Handle user apply limit and cooldown logic here or in the EligibilityService

    if (!user) {
      console.log(`User ${payload.userId} not found.`);
      return;
    }
    const entitlement = user.entitlements[0];
    const record = (value: unknown): Record<string, any> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, any> : {};
    const features = { ...record(entitlement?.tier.features), ...record(entitlement?.featuresSnapshot), ...record(entitlement?.featureOverrides) };
    const limits = { ...record(entitlement?.tier.limits), ...record(entitlement?.limitsSnapshot), ...record(entitlement?.limitOverrides) };
    if (!entitlement || features.application_tracking !== true) {
      console.log(`User ${payload.userId} is not entitled to automated applications.`);
      return;
    }
    if (user.isUnstopInternshipEnabled === false) {
      console.log(`
      User ${payload.userId} has disabled Unstop internship auto-apply.`);
      return;
    }
    const encryptedCookie = user.platformSessions.find(
      (session) => session.platform === "unstop",
    )?.encryptedCookie;

    if (!encryptedCookie) {
      console.log(`No Unstop cookie found for user ${user.id}.`);
      return;
    }

    const decryptedCookie = decrypt(encryptedCookie);

    const agent = agentRegistry["unstop"];

    if (!agent) {
      console.log(`No agent for unstop`);
      return;
    }

    const result = await agent({
      userId: user.id,
      cookie: decryptedCookie,
      preferences: user.preferences,
      skills: user.skills,
    });

    if (!result?.applications?.length) {
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const applicationLimit = limits.applications_per_month === -1 ? Number.POSITIVE_INFINITY : typeof limits.applications_per_month === "number" ? limits.applications_per_month : 0;
    const applicationCount = await prisma.user_job_applications.count({ where: { userId: user.id, appliedAt: { gte: startOfMonth } } });
    if (applicationLimit !== Number.POSITIVE_INFINITY && applicationCount >= applicationLimit) {
      console.log(`User ${payload.userId} has reached the monthly application limit.`);
      return;
    }
    const remaining = applicationLimit === Number.POSITIVE_INFINITY ? result.applications.length : Math.max(applicationLimit - applicationCount, 0);
    const applications = result.applications.slice(0, remaining);
    if (!applications.length) return;
    await prisma.user_job_applications.createMany({
      data: applications.map((application: any) => ({
        userId: user.id,

        platform: "unstop",

        jobTitle: application.title,
        company: application.company,
        jobLink: application.link,
        type: application.type,

        status: application.status,
        notes: application.notes,
      })),
    });
  }
}
