import { Queue } from "bullmq";
import { QueueName } from "./queueNames";
import { connection } from "./connection";
import { defaultQueueOptions } from "./queueConfig";

export function createQueue(name: QueueName) {
  return new Queue(name, {
    connection,
    defaultJobOptions: defaultQueueOptions,
  });
}