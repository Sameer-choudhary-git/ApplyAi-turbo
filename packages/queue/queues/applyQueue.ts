import { Queue } from "bullmq";
import { connection } from "../src/connection";

export const applyQueue = new Queue("apply", {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5 second initial delay before retry
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
