import { createSentryWorker, WorkerService, QueueName } from "@applyai/queue";

import { applyRegistry } from "../registry/applyRegistry";

const worker = createSentryWorker({
  queue: QueueName.APPLY,
  registry: applyRegistry,
  concurrency: 5,
});

WorkerService.register(worker);

export default worker;
