import { createWorker, WorkerService, QueueName } from "@applyai/queue";

import { applyRegistry } from "../registry/applyRegistry";

const worker = createWorker({
  queue: QueueName.APPLY,
  registry: applyRegistry,
  concurrency: 5,
});

WorkerService.register(worker);

export default worker;
