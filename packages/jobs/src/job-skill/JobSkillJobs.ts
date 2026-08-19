import { BaseJob } from "../BaseJob";
import { JobNames } from "../JobNames";
import { QueueName } from "@applyai/queue";

export interface JobSkillRunPayload {
  runId: string;
  userId: string;
}

export class JobSkillSearchJob extends BaseJob<JobSkillRunPayload> {
  constructor(payload: JobSkillRunPayload) {
    super(QueueName.JOB_SKILL, JobNames.JOB_SKILL.SEARCH, payload);
  }
}

export class JobSkillMaterialsJob extends BaseJob<JobSkillRunPayload> {
  constructor(payload: JobSkillRunPayload) {
    super(QueueName.JOB_SKILL, JobNames.JOB_SKILL.MATERIALS, payload);
  }
}

export class JobSkillReportJob extends BaseJob<JobSkillRunPayload> {
  constructor(payload: JobSkillRunPayload) {
    super(QueueName.JOB_SKILL, JobNames.JOB_SKILL.REPORT, payload);
  }
}
