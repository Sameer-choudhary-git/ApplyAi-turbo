import { Queue } from "bullmq";
import { QueueName } from "./queueNames";
import { connection } from "./connection";
import { defaultQueueOptions } from "./queueConfig";

export function createQueue(name: QueueName) {
  if (!connection) {
    throw new Error('Redis is disabled; queue operations are unavailable in this environment.');
  }
  return new Queue(name, {
    connection,
    defaultJobOptions: defaultQueueOptions,
  });
}


