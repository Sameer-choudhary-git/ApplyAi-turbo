import { prisma } from "@applyai/db";
import { JobSkillMaterialsJob, JobSkillReportJob } from "@applyai/jobs";
import type { JobHandler } from "../../../../../packages/queue/src/sentryWorkerFactory";
import { scoreOpportunity, searchProviders, type JobSkillCriteria } from "../../services/job-skill/provider";

function record(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, any> : {};
}

export class JobSkillSearchHandler implements JobHandler<{ runId: string; userId: string }> {
  async execute(payload: { runId: string; userId: string }): Promise<void> {
    const run = await prisma.job_skill_runs.findFirst({ where: { id: payload.runId, userId: payload.userId } });
    if (!run || ["completed", "failed", "cancelled"].includes(run.status)) return;

    await prisma.job_skill_runs.update({ where: { id: run.id }, data: { status: "running", startedAt: run.startedAt || new Date() } });
    const configuration = record(run.preferencesSnapshot);
    const criteria: JobSkillCriteria = {
      roles: Array.isArray(configuration.roles) ? configuration.roles.filter((value: unknown): value is string => typeof value === "string") : [],
      locations: Array.isArray(configuration.locations) ? configuration.locations.filter((value: unknown): value is string => typeof value === "string") : [],
      providerKeys: Array.isArray(configuration.providerKeys) ? configuration.providerKeys.filter((value: unknown): value is string => typeof value === "string") : ["unstop"],
      companyTypes: Array.isArray(configuration.companyTypes) ? configuration.companyTypes.filter((value: unknown): value is string => typeof value === "string") : [],
      seniority: typeof configuration.seniority === "string" ? configuration.seniority : null,
      salaryMin: typeof configuration.salaryMin === "number" ? configuration.salaryMin : null,
      salaryMax: typeof configuration.salaryMax === "number" ? configuration.salaryMax : null,
      maxResults: typeof configuration.maxResults === "number" ? configuration.maxResults : 50,
    };

    const { results, failures } = await searchProviders(criteria);
    const profile = record(run.profileSnapshot);
    const persisted = [] as { id: string; fitnessScore: number }[];
    for (const result of results) {
      const scored = scoreOpportunity(result, profile, criteria);
      const opportunity = await prisma.job_skill_opportunities.upsert({
        where: { userId_canonicalUrl: { userId: payload.userId, canonicalUrl: result.canonicalUrl } },
        create: {
          userId: payload.userId,
          runId: run.id,
          provider: result.provider,
          externalId: result.externalId,
          canonicalUrl: result.canonicalUrl,
          sourceUrl: result.sourceUrl,
          title: result.title,
          company: result.company,
          location: result.location,
          jobType: result.jobType,
          salary: result.salary,
          description: result.description,
          postedAt: result.postedAt,
          rawData: result.rawData as any,
          fitnessScore: scored.score,
          scoreReason: scored.reason,
          status: "found",
        },
        update: {
          runId: run.id,
          provider: result.provider,
          externalId: result.externalId,
          sourceUrl: result.sourceUrl,
          title: result.title,
          company: result.company,
          location: result.location,
          jobType: result.jobType,
          salary: result.salary,
          description: result.description,
          postedAt: result.postedAt,
          rawData: result.rawData as any,
          fitnessScore: scored.score,
          scoreReason: scored.reason,
          status: "found",
        },
      });
      persisted.push({ id: opportunity.id, fitnessScore: scored.score });
    }

    const materialLimit = typeof configuration.materialLimit === "number" ? configuration.materialLimit : 0;
    const nextStatus = materialLimit > 0 && persisted.some((item) => item.fitnessScore >= 60) ? "materials_queued" : "report_queued";
    await prisma.job_skill_runs.update({
      where: { id: run.id },
      data: {
        status: nextStatus,
        providerCount: criteria.providerKeys.length,
        foundCount: persisted.length,
        errorSummary: failures.length ? failures.join(" | ").slice(0, 2000) : null,
      },
    });

    if (nextStatus === "materials_queued") {
      await new JobSkillMaterialsJob({ runId: run.id, userId: payload.userId }).enqueue({ attempts: 2, backoff: { type: "exponential", delay: 10000 }, removeOnComplete: 100, removeOnFail: 100 });
    } else {
      await new JobSkillReportJob({ runId: run.id, userId: payload.userId }).enqueue({ attempts: 2, backoff: { type: "exponential", delay: 10000 }, removeOnComplete: 100, removeOnFail: 100 });
    }
  }
}
