import { JobNames } from "@applyai/jobs";
import type { JobHandler } from "../../../../packages/queue/src/sentryWorkerFactory";
import { JobSkillMaterialsHandler } from "../handlers/job-skill/JobSkillMaterialsHandler";
import { JobSkillReportHandler } from "../handlers/job-skill/JobSkillReportHandler";
import { JobSkillSearchHandler } from "../handlers/job-skill/JobSkillSearchHandler";

export const jobSkillRegistry = new Map<string, JobHandler>([
  [JobNames.JOB_SKILL.SEARCH, new JobSkillSearchHandler()],
  [JobNames.JOB_SKILL.MATERIALS, new JobSkillMaterialsHandler()],
  [JobNames.JOB_SKILL.REPORT, new JobSkillReportHandler()],
]);
