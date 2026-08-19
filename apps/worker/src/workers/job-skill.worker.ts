import { createSentryWorker, QueueName, WorkerService } from "@applyai/queue";
import { jobSkillRegistry } from "../registry/jobSkillRegistry";

const worker = createSentryWorker({
  queue: QueueName.JOB_SKILL,
  registry: jobSkillRegistry,
  concurrency: Number(process.env.JOB_SKILL_WORKER_CONCURRENCY || 2),
  lockDuration: 120000,
});

WorkerService.register(worker);

export default worker;
