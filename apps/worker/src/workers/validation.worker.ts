import { createSentryWorker, WorkerService, QueueName } from "@applyai/queue";

import { validationRegistry } from "../registry/validationRegistry";

const worker = createSentryWorker({
  queue: QueueName.VALIDATION,
  registry: validationRegistry,
});

WorkerService.register(worker);

export default worker;
