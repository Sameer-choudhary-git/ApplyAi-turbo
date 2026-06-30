import { QueueName, QueueService } from "@applyai/queue";
export class Job {
  QueueName: QueueName;
  payload: any;
  jobName: string = "Job";
  constructor(queueName: QueueName, jobName?: string) {
    this.QueueName = queueName;
    this.jobName = jobName || "Job";
  }
  async enqueue() {
    await QueueService.enqueue(this.QueueName, this.jobName, this.payload);
  }
  setPayload(payload: any) {
    this.payload = payload;
  }
  executePayload() {
    this.payload();
  }
}

export class ExtractJob extends Job {
  constructor(payload: any, jobName?: string) {
    super(QueueName.EXTRACT, jobName || "ExtractJob");
    this.setPayload(payload);
  }
}

export class ApplyJob extends Job {
  constructor(payload: any, jobName?: string) {
    super(QueueName.APPLY, jobName || "ApplyJob");
    this.setPayload(payload);

  }
}

export class ValidateJob extends Job {
  constructor(payload: any, jobName?: string) {
    super(QueueName.VALIDATION, jobName || "ValidateJob");
    this.setPayload(payload);
  }
}
