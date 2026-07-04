import { Worker } from "bullmq";

export class WorkerService {
  private static workers: Worker[] = [];

  static register(worker: Worker) {
    this.workers.push(worker);
  }

  static async closeAll() {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}
