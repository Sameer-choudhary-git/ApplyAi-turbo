import { createWorker, WorkerService, QueueName } from "@applyai/queue";

import { extractRegistry } from "../registry/extractRegistry";

const worker = createWorker({
  queue: QueueName.EXTRACT,
  registry: extractRegistry,
});

WorkerService.register(worker);

export default worker;
