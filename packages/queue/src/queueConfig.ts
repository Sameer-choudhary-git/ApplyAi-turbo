import type { JobsOptions } from "bullmq";

export const defaultQueueOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
