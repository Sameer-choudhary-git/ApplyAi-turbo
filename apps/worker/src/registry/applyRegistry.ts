import { ApplyJobNames, JobNames } from "@applyai/jobs";

import { ApplyUnstopInternshipsHandler } from "../handlers/apply/ApplyUnstopInternshipsHandler";
import { QueueEligibleUsersHandler } from "../handlers/apply/QueueEligibleUsersHandler";
import { GreenhouseApplicationSelectionHandler } from "../handlers/greenhouse/GreenhouseApplicationSelectionHandler";
import { GreenhouseAutofillHandler } from "../handlers/greenhouse/GreenhouseAutofillHandler";

import { JobHandler } from "../../../../packages/queue/src/workerFactory";

export const applyRegistry = new Map<ApplyJobNames, JobHandler>([
  [JobNames.APPLY.QUEUE_ELIGIBLE_USERS, new QueueEligibleUsersHandler()],
  [
    JobNames.APPLY.GREENHOUSE_SELECTION,
    new GreenhouseApplicationSelectionHandler(),
  ],
  [JobNames.APPLY.GREENHOUSE_AUTOFILL, new GreenhouseAutofillHandler()],

  [
    JobNames.APPLY.APPLY_UNSTOP_INTERNSHIPS,
    new ApplyUnstopInternshipsHandler(),
  ],
]);
