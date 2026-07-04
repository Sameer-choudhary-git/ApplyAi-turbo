import { QueueName, QueueService } from "@applyai/queue";

export abstract class BaseJob<T> {
  constructor(
    public readonly queue: QueueName,
    public readonly jobName: string,
    public readonly payload: T,
  ) {}

  enqueue(options?: Parameters<typeof QueueService.enqueue>[3]) {
    return QueueService.enqueue(
      this.queue,
      this.jobName,
      this.payload,
      options,
    );
  }
}
