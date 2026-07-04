import { QueueName } from "@applyai/queue";
import { BaseJob } from "../BaseJob";

export class ExtractJob<T> extends BaseJob<T> {
  constructor(jobName: string, payload: T) {
    super(QueueName.EXTRACT, jobName, payload);
  }
}
