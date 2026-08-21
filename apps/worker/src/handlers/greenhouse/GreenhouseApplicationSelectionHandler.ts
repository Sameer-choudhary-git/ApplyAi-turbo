import { QueueName, QueueService } from "@applyai/queue";
import { JobNames } from "@applyai/jobs";
import type { JobHandler } from "@applyai/queue";
import { selectGreenhouseApplications } from "@applyai/greenhouse";

export class GreenhouseApplicationSelectionHandler implements JobHandler {
  async execute(): Promise<void> {
    const result = await selectGreenhouseApplications();
    const queue = QueueService.getQueue(QueueName.APPLY);
    for (const application of result.applications ?? []) {
      await queue.add(
        JobNames.APPLY.GREENHOUSE_AUTOFILL,
        {
          userId: application.userId,
          applicationId: application.applicationId,
          submit: application.submit,
        },
        { jobId: `greenhouse-autofill-${application.applicationId}-fill` },
      );
    }
    console.log(
      `[greenhouse] application selection and autofill queued: ${JSON.stringify(
        {
          users: result.users,
          jobs: result.jobs,
          prepared: result.prepared,
          autofillQueued: result.applications?.length ?? 0,
        },
      )}`,
    );
  }
}
