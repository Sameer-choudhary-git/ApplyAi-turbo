import { ValidationJob } from "./ValidationJob";
import { JobNames } from "../JobNames";

export class UnstopValidationJob extends ValidationJob<{}> {
  constructor() {
    super(JobNames.VALIDATION.UNSTOP, {});
  }
}
