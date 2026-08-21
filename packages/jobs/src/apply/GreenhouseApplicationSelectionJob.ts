import { ApplyJob } from "./ApplyJob";
import { JobNames } from "../JobNames";

export class GreenhouseApplicationSelectionJob extends ApplyJob<
  Record<string, never>
> {
  constructor() {
    super(JobNames.APPLY.GREENHOUSE_SELECTION, {});
  }
}
