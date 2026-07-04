import { QueueName } from "@applyai/queue";
import { BaseJob } from "../BaseJob";

export class ValidationJob<T> extends BaseJob<T> {
  constructor(jobName: string, payload: T) {
    super(QueueName.VALIDATION, jobName, payload);
  }
}
