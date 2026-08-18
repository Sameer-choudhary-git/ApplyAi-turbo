import { ApplyJob } from "./ApplyJob";
import { JobNames } from "../JobNames";

export type GreenhouseAutofillPayload = {
  userId: string;
  applicationId: string;
  submit?: boolean;
};

export class GreenhouseAutofillJob extends ApplyJob<GreenhouseAutofillPayload> {
  constructor(payload: GreenhouseAutofillPayload) {
    super(JobNames.APPLY.GREENHOUSE_AUTOFILL, payload);
  }
}
