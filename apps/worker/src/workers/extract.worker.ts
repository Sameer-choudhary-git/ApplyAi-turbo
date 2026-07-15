import { createWorker, WorkerService, QueueName } from "@applyai/queue";

import { extractRegistry } from "../registry/extractRegistry";

const worker = createWorker({
  queue: QueueName.EXTRACT,
  registry: extractRegistry,
  concurrency: 2,
  lockDuration: 200000,
});

WorkerService.register(worker);

export default worker;
