// packages/queue/queues/applyQueue.ts

import { Queue } from "bullmq";
import { connection } from "../connection";

export const applyQueue = new Queue("apply-job", {
  connection,
});