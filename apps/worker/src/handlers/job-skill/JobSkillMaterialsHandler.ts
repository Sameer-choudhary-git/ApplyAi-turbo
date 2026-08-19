import { prisma } from "@applyai/db";
import { JobSkillReportJob } from "@applyai/jobs";
import type { JobHandler } from "../../../../../packages/queue/src/sentryWorkerFactory";
import { checksum, generateMaterials, storeMaterial } from "../../services/job-skill/materials";

function record(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, any> : {};
}

export class JobSkillMaterialsHandler implements JobHandler<{ runId: string; userId: string }> {
  async execute(payload: { runId: string; userId: string }): Promise<void> {
    const run = await prisma.job_skill_runs.findFirst({ where: { id: payload.runId, userId: payload.userId } });
    if (!run || ["completed", "failed", "cancelled"].includes(run.status)) return;
    await prisma.job_skill_runs.update({ where: { id: run.id }, data: { status: "generating_materials" } });

    const configuration = record(run.preferencesSnapshot);
    const requestedMaterialLimit = Number(configuration.materialLimit || 0);
    const materialLimit = requestedMaterialLimit === Number.POSITIVE_INFINITY ? 1000 : Math.min(Math.max(0, requestedMaterialLimit), 1000);
    const opportunities = await prisma.job_skill_opportunities.findMany({ where: { userId: payload.userId, runId: run.id, fitnessScore: { gte: 60 } }, orderBy: { fitnessScore: "desc" }, take: materialLimit });
    const profile = record(run.profileSnapshot);
    let generatedCount = 0;
    const failures: string[] = [];

    for (const opportunity of opportunities) {
      try {
        const materials = await generateMaterials(profile, opportunity);
        const baseKey = `job-skill/${payload.userId}/${run.id}/${opportunity.id}`;
        const [resumeUrl, coverLetterUrl, zipUrl] = await Promise.all([
          storeMaterial(materials.resume, `${baseKey}/${materials.resumeName}`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          storeMaterial(materials.coverLetter, `${baseKey}/${materials.coverLetterName}`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          storeMaterial(materials.zip, `${baseKey}/${materials.zipName}`, "application/zip"),
        ]);
        await prisma.$transaction([
          prisma.job_skill_artifacts.create({ data: { userId: payload.userId, runId: run.id, opportunityId: opportunity.id, kind: "resume", status: "ready", fileName: materials.resumeName, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", storageKey: `${baseKey}/${materials.resumeName}`, publicUrl: resumeUrl, checksum: checksum(materials.resume) } }),
          prisma.job_skill_artifacts.create({ data: { userId: payload.userId, runId: run.id, opportunityId: opportunity.id, kind: "cover_letter", status: "ready", fileName: materials.coverLetterName, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", storageKey: `${baseKey}/${materials.coverLetterName}`, publicUrl: coverLetterUrl, checksum: checksum(materials.coverLetter) } }),
          prisma.job_skill_artifacts.create({ data: { userId: payload.userId, runId: run.id, opportunityId: opportunity.id, kind: "bundle", status: "ready", fileName: materials.zipName, contentType: "application/zip", storageKey: `${baseKey}/${materials.zipName}`, publicUrl: zipUrl, checksum: checksum(materials.zip) } }),
        ]);
        generatedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "material generation failed";
        failures.push(`${opportunity.company}/${opportunity.title}: ${message}`);
        await prisma.job_skill_artifacts.create({ data: { userId: payload.userId, runId: run.id, opportunityId: opportunity.id, kind: "bundle", status: "failed", fileName: `${opportunity.company}_${opportunity.title}_Application_Materials.zip`.replace(/[^a-z0-9_.-]+/gi, "_"), contentType: "application/zip", errorMessage: message.slice(0, 500) } });
      }
    }

    await prisma.job_skill_runs.update({ where: { id: run.id }, data: { status: "report_queued", generatedCount, errorSummary: failures.length ? [run.errorSummary, ...failures].filter(Boolean).join(" | ").slice(0, 2000) : run.errorSummary } });
    await new JobSkillReportJob({ runId: run.id, userId: payload.userId }).enqueue({ attempts: 2, backoff: { type: "exponential", delay: 10000 }, removeOnComplete: 100, removeOnFail: 100 });
  }
}
