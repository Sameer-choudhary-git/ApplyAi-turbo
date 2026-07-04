import { JobNames } from "../JobNames";
import { ApplyJob } from "./ApplyJob";

export class QueueEligibleUsersJob extends ApplyJob<{}> {
  constructor() {
    super(JobNames.APPLY.QUEUE_ELIGIBLE_USERS, {});
  }
}
