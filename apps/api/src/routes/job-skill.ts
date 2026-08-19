import { createHash, randomUUID } from "node:crypto";
import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { JobSkillSearchJob } from "@applyai/jobs";
import { authMiddleware } from "../middleware/auth";
import { deleteCachedPattern } from "../lib/cache";
import { getEffectiveEntitlement, getEntitlementLimit, hasFeature } from "../lib/entitlements";

export const jobSkillRouter = new Hono();

const DEFAULT_PROVIDERS = ["unstop"];
const ALLOWED_PROVIDERS = new Set(["unstop", "manual", "linkedin", "naukri", "indeed", "wellfound", "cutshort", "hirist", "foundit", "shine", "timesjobs", "glassdoor", "weworkremotely", "company_careers"]);
const ALLOWED_FREQUENCIES = new Set(["nightly", "weekdays", "weekly"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function stringArray(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, max);
}

function validCron(cron: string): boolean {
  return cron.trim().split(/\s+/).length === 5 && cron.trim().split(/\s+/).every((part) => /^[0-9*/?,\-A-Z]+$/i.test(part));
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function publicOpportunity(opportunity: any) {
  return {
    id: opportunity.id,
    provider: opportunity.provider,
    externalId: opportunity.externalId,
    canonicalUrl: opportunity.canonicalUrl,
    sourceUrl: opportunity.sourceUrl,
    title: opportunity.title,
    company: opportunity.company,
    location: opportunity.location,
    jobType: opportunity.jobType,
    salary: opportunity.salary,
    description: opportunity.description,
    postedAt: opportunity.postedAt,
    fitnessScore: opportunity.fitnessScore,
    scoreReason: opportunity.scoreReason,
    status: opportunity.status,
    savedJobId: opportunity.savedJobId,
    applicationId: opportunity.applicationId,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    artifacts: Array.isArray(opportunity.artifacts) ? opportunity.artifacts.map((artifact: any) => ({ id: artifact.id, kind: artifact.kind, fileName: artifact.fileName, publicUrl: artifact.publicUrl, status: artifact.status })) : [],
  };
}

async function requireFeature(userId: string, feature: string) {
  return hasFeature(userId, feature);
}

jobSkillRouter.use("*", authMiddleware);

jobSkillRouter.get("/providers", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  return c.json({
    success: true,
    providers: Array.from(ALLOWED_PROVIDERS).map((key) => ({ key, enabled: DEFAULT_PROVIDERS.includes(key), configured: DEFAULT_PROVIDERS.includes(key) })),
  });
});

jobSkillRouter.get("/runs", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);

  const runs = await prisma.job_skill_runs.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(c.req.query("limit") || 20), 100),
    include: { artifacts: { where: { kind: "report", status: "ready" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return c.json({ success: true, runs });
});

jobSkillRouter.get("/runs/:id", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  const run = await prisma.job_skill_runs.findFirst({
    where: { id: c.req.param("id"), userId },
    include: { opportunities: { orderBy: [{ fitnessScore: "desc" }, { createdAt: "desc" }] }, artifacts: { orderBy: { createdAt: "desc" } } },
  });
  if (!run) return c.json({ success: false, error: "Run not found" }, 404);
  return c.json({ success: true, run: { ...run, opportunities: run.opportunities.map(publicOpportunity) } });
});

jobSkillRouter.get("/opportunities", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  const search = text(c.req.query("search"));
  const minScore = Number(c.req.query("minScore") || 0);
  const where: any = { userId };
  if (Number.isFinite(minScore) && minScore > 0) where.fitnessScore = { gte: Math.min(minScore, 100) };
  if (search) where.OR = [{ title: { contains: search, mode: "insensitive" } }, { company: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }];
  const opportunities = await prisma.job_skill_opportunities.findMany({ where, include: { artifacts: { where: { status: "ready" }, orderBy: { createdAt: "desc" } } }, orderBy: [{ fitnessScore: "desc" }, { createdAt: "desc" }], take: 100 });
  return c.json({ success: true, opportunities: opportunities.map(publicOpportunity) });
});

jobSkillRouter.post("/runs", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const entitlement = await getEffectiveEntitlement(userId);
  const limit = getEntitlementLimit(entitlement, "manual_runs_per_day", 0);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const runsToday = await prisma.job_skill_runs.count({ where: { userId, triggerType: "manual", createdAt: { gte: startOfDay } } });
  if (limit >= 0 && runsToday >= limit) return c.json({ success: false, error: "Your daily manual Job Skill run limit has been reached" }, 429);

  const roles = stringArray(body.roles).length ? stringArray(body.roles) : stringArray((entitlement as any)?.preferences?.rolesOfInterest);
  const locations = stringArray(body.locations).length ? stringArray(body.locations) : [];
  const providerKeys = (stringArray(body.providerKeys).length ? stringArray(body.providerKeys) : DEFAULT_PROVIDERS).filter((key) => ALLOWED_PROVIDERS.has(key));
  if (!roles.length && !locations.length) return c.json({ success: false, error: "Add at least one target role or location before starting a run" }, 400);
  if (!providerKeys.length) return c.json({ success: false, error: "No configured job providers were selected" }, 400);

  const maxResults = Math.min(Math.max(Number(body.maxResults || getEntitlementLimit(entitlement, "results_per_run", 50)), 1), getEntitlementLimit(entitlement, "results_per_run", 50));
  const materialLimit = Math.min(Math.max(Number(body.materialLimit || getEntitlementLimit(entitlement, "materials_per_run", 0)), 0), getEntitlementLimit(entitlement, "materials_per_run", 0));
  const configuration = {
    roles,
    locations,
    providerKeys,
    companyTypes: stringArray(body.companyTypes),
    seniority: text(body.seniority),
    salaryMin: Number.isFinite(Number(body.salaryMin)) ? Number(body.salaryMin) : null,
    salaryMax: Number.isFinite(Number(body.salaryMax)) ? Number(body.salaryMax) : null,
    maxResults,
    materialLimit,
  };
  const configurationHash = stableHash(configuration);
  const idempotencyKey = text(body.idempotencyKey) || `manual:${new Date().toISOString().slice(0, 10)}:${randomUUID()}`;
  const user = await prisma.users.findUnique({ where: { id: userId }, include: { preferences: true, education: true, experience: true, skills: true } });
  if (!user) return c.json({ success: false, error: "Complete onboarding before starting a Job Skill run" }, 400);

  const run = await prisma.job_skill_runs.create({
    data: {
      userId,
      triggerType: "manual",
      status: "queued",
      idempotencyKey,
      configurationHash,
      profileSnapshot: { fullName: user.fullName, location: user.location, bio: user.bio, linkedinUrl: user.linkedinUrl, githubUrl: user.githubUrl, education: user.education, experience: user.experience, skills: user.skills.map((skill) => skill.skill), resumeUrl: user.resumeUrl },
      preferencesSnapshot: { ...(user.preferences ?? {}), ...configuration },
      entitlementSnapshot: (entitlement ? { tierKey: entitlement.tier.key, features: entitlement.featuresSnapshot, limits: entitlement.limitsSnapshot } : {}) as any,
    },
  });

  try {
    await new JobSkillSearchJob({ runId: run.id, userId }).enqueue({ attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 });
  } catch (error) {
    await prisma.job_skill_runs.update({ where: { id: run.id }, data: { status: "failed", errorSummary: "Unable to enqueue run" } });
    console.error("Job Skill enqueue failed:", error);
    return c.json({ success: false, error: "Unable to start Job Skill run" }, 503);
  }
  return c.json({ success: true, run: { id: run.id, status: run.status, triggerType: run.triggerType, createdAt: run.createdAt } }, 202);
});

jobSkillRouter.post("/opportunities/:id/save", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  const opportunity = await prisma.job_skill_opportunities.findFirst({ where: { id: c.req.param("id"), userId } });
  if (!opportunity) return c.json({ success: false, error: "Opportunity not found" }, 404);
  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.user_saved_jobs.findFirst({ where: { userId, url: opportunity.canonicalUrl } });
    const job = existing ?? await tx.user_saved_jobs.create({ data: { userId, title: opportunity.title, company: opportunity.company, url: opportunity.canonicalUrl, location: opportunity.location, type: "job", sourceSite: opportunity.provider, notes: opportunity.scoreReason, status: "saved", description: opportunity.description, deadline: null } });
    await tx.job_skill_opportunities.update({ where: { id: opportunity.id }, data: { savedJobId: job.id, status: "saved" } });
    return job;
  });
  await deleteCachedPattern(`saved-jobs:${userId}:*`);
  return c.json({ success: true, savedJob: saved });
});

jobSkillRouter.post("/opportunities/:id/apply", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_search"))) return c.json({ success: false, error: "Job Skill access requires an active entitlement" }, 403);
  const opportunity = await prisma.job_skill_opportunities.findFirst({ where: { id: c.req.param("id"), userId } });
  if (!opportunity) return c.json({ success: false, error: "Opportunity not found" }, 404);
  const application = await prisma.$transaction(async (tx) => {
    const existing = opportunity.applicationId ? await tx.user_job_applications.findUnique({ where: { id: opportunity.applicationId } }) : null;
    const created = existing ?? await tx.user_job_applications.create({ data: { userId, platform: opportunity.provider, jobTitle: opportunity.title, company: opportunity.company, jobLink: opportunity.canonicalUrl, status: "applied", type: "job", location: opportunity.location, metadata: { source: "job_skill", opportunityId: opportunity.id } } });
    await tx.job_skill_opportunities.update({ where: { id: opportunity.id }, data: { applicationId: created.id, status: "applied" } });
    return created;
  });
  return c.json({ success: true, application }, 201);
});

jobSkillRouter.get("/schedule", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_schedule"))) return c.json({ success: false, error: "Job Skill scheduling requires an active entitlement" }, 403);
  const schedule = await prisma.job_skill_schedules.findUnique({ where: { userId } });
  return c.json({ success: true, schedule });
});

jobSkillRouter.put("/schedule", async (c) => {
  const userId = c.get("userId") as string;
  if (!(await requireFeature(userId, "job_skill_schedule"))) return c.json({ success: false, error: "Job Skill scheduling requires an active entitlement" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const cronExpression = text(body.cronExpression) || "30 18 * * *";
  if (!validCron(cronExpression)) return c.json({ success: false, error: "Invalid five-field cron expression" }, 400);
  const timezone = text(body.timezone) || "Asia/Kolkata";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); } catch { return c.json({ success: false, error: "Invalid timezone" }, 400); }
  const entitlement = await getEffectiveEntitlement(userId);
  const maxResults = Math.min(Math.max(Number(body.maxResults || 50), 1), getEntitlementLimit(entitlement, "results_per_run", 50));
  const materialLimit = Math.min(Math.max(Number(body.materialLimit || 10), 0), getEntitlementLimit(entitlement, "materials_per_run", 0));
  const nextRunAt = enabled ? new Date(Date.now() + 5 * 60 * 1000) : null;
  const requestedProviders = stringArray(body.providerKeys).filter((key) => ALLOWED_PROVIDERS.has(key));
  const providerKeys = requestedProviders.length ? requestedProviders : DEFAULT_PROVIDERS;
  const schedule = await prisma.job_skill_schedules.upsert({ where: { userId }, create: { userId, enabled, cronExpression, timezone, providerKeys, roles: stringArray(body.roles), locations: stringArray(body.locations), companyTypes: stringArray(body.companyTypes), seniority: text(body.seniority), salaryMin: Number.isFinite(Number(body.salaryMin)) ? Number(body.salaryMin) : null, salaryMax: Number.isFinite(Number(body.salaryMax)) ? Number(body.salaryMax) : null, maxResults, materialLimit, nextRunAt }, update: { enabled, cronExpression, timezone, providerKeys, roles: stringArray(body.roles), locations: stringArray(body.locations), companyTypes: stringArray(body.companyTypes), seniority: text(body.seniority), salaryMin: Number.isFinite(Number(body.salaryMin)) ? Number(body.salaryMin) : null, salaryMax: Number.isFinite(Number(body.salaryMax)) ? Number(body.salaryMax) : null, maxResults, materialLimit, nextRunAt } });
  return c.json({ success: true, schedule });
});

export default jobSkillRouter;
