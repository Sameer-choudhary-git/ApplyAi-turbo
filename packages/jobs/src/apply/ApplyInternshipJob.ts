import { JobNames } from "../JobNames";
import { ApplyJob } from "./ApplyJob";
import type { ApplyUnstopInternshipPayload } from "@applyai/apply";

export class ApplyUnstopInternshipsJob extends ApplyJob<ApplyUnstopInternshipPayload> {
  constructor(payload: ApplyUnstopInternshipPayload) {
    super(JobNames.APPLY.APPLY_UNSTOP_INTERNSHIPS, payload);
  }
}
