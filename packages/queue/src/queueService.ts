import { Job, Queue } from "bullmq";

import { QueueName } from "./queueNames";
import { createQueue } from "./queueFactory";

export class QueueService {
  private static queues = new Map<QueueName, Queue>();

  static getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, createQueue(name));
    }

    return this.queues.get(name)!;
  }

  static async enqueue<T>(
    queue: QueueName,
    jobName: string,
    payload: T,
    options?: Parameters<Queue["add"]>[2]
  ): Promise<Job> {
    return this.getQueue(queue).add(jobName, payload, options);
  }
}