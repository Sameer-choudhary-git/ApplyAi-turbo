import { Worker } from "bullmq";

import { connection } from "./connection";
import { QueueName } from "./queueNames";

export interface JobHandler<T = any> {
  execute(payload: T): Promise<void>;
}

export type JobRegistry = Map<string, JobHandler<any>>;

interface WorkerFactoryOptions {
  queue: QueueName;

  registry: JobRegistry;

  concurrency?: number;
}

export function createWorker({
  queue,
  registry,
  concurrency = 5,
}: WorkerFactoryOptions) {
  const worker = new Worker(
    queue,

    async (job) => {
      const handler = registry.get(job.name);

      if (!handler) {
        throw new Error(`No handler registered for "${job.name}"`);
      }

      await handler.execute(job.data);
    },

    {
      connection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[${queue}] completed -> ${job.name}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${queue}] failed -> ${job?.name}`, err);
  });

  worker.on("error", (err) => {
    console.error(`[${queue}]`, err);
  });

  return worker;
}
