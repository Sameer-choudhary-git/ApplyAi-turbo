import { ApplyJobNames, JobNames } from "@applyai/jobs";

import { ApplyUnstopInternshipsHandler } from "../handlers/apply/ApplyUnstopInternshipsHandler";
import { QueueEligibleUsersHandler } from "../handlers/apply/QueueEligibleUsersHandler";
import { JobHandler } from "../../../../packages/queue/src/workerFactory";

export const applyRegistry = new Map<ApplyJobNames, JobHandler>([
  [JobNames.APPLY.QUEUE_ELIGIBLE_USERS, new QueueEligibleUsersHandler()],
  [
    JobNames.APPLY.APPLY_UNSTOP_INTERNSHIPS,
    new ApplyUnstopInternshipsHandler(),
  ],
]);
