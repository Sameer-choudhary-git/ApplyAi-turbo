import { QueueName } from "@applyai/queue";
import { BaseJob } from "../BaseJob";

export class ApplyJob<T> extends BaseJob<T> {
  constructor(jobName: string, payload: T) {
    super(QueueName.APPLY, jobName, payload);
  }
}
