import { prisma } from "@applyai/db";
import type { JobHandler } from "../../../../../packages/queue/src/sentryWorkerFactory";
import { checksum, storeMaterial } from "../../services/job-skill/materials";

function reportMarkdown(run: any): string {
  const date = new Date().toISOString().slice(0, 10);
  const opportunities = [...run.opportunities].sort((a: any, b: any) => (b.fitnessScore || 0) - (a.fitnessScore || 0));
  const lines = [
    `# Job Skill Report — ${date}`,
    "",
    `**Status:** ${run.status}`,
    `**Opportunities found:** ${run.foundCount}`,
    `**Materials generated:** ${run.generatedCount}`,
    "",
    "## Matches",
    "",
    "| # | Role | Company | Location | Fitness | Provider | Apply |",
    "|---:|---|---|---|---:|---|---|",
  ];
  opportunities.forEach((opportunity: any, index) => {
    lines.push(`| ${index + 1} | ${opportunity.title.replace(/\|/g, "\\|")} | ${opportunity.company.replace(/\|/g, "\\|")} | ${(opportunity.location || "Remote/unspecified").replace(/\|/g, "\\|")} | ${opportunity.fitnessScore ?? "—"}% | ${opportunity.provider} | [Open](${opportunity.canonicalUrl}) |`);
    if (opportunity.scoreReason) lines.push(`\n> **Why:** ${opportunity.scoreReason}\n`);
  });
  if (run.errorSummary) lines.push("", "## Provider or material notes", "", run.errorSummary);
  lines.push("", "Review each role and submit applications manually. This system does not submit applications or bypass platform security controls.");
  return lines.join("\n");
}

export class JobSkillReportHandler implements JobHandler<{ runId: string; userId: string }> {
  async execute(payload: { runId: string; userId: string }): Promise<void> {
    const run = await prisma.job_skill_runs.findFirst({ where: { id: payload.runId, userId: payload.userId }, include: { opportunities: true, artifacts: true } });
    if (!run || run.status === "completed") return;
    const report = reportMarkdown(run);
    const buffer = Buffer.from(report, "utf8");
    const fileName = `job-skill-report-${run.id}.md`;
    const storageKey = `job-skill/${payload.userId}/${run.id}/${fileName}`;
    let publicUrl: string | null = null;
    let status = "ready";
    let errorMessage: string | null = null;
    try {
      publicUrl = await storeMaterial(buffer, storageKey, "text/markdown; charset=utf-8");
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "report storage failed";
    }
    await prisma.job_skill_artifacts.create({ data: { userId: payload.userId, runId: run.id, kind: "report", status, fileName, contentType: "text/markdown", storageKey: publicUrl ? storageKey : null, publicUrl, checksum: checksum(buffer), errorMessage } });
    await prisma.job_skill_runs.update({ where: { id: run.id }, data: { status: "completed", completedAt: new Date() } });
  }
}
