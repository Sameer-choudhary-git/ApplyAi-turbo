// apps/worker/src/handlers/apply/ApplyUnstopInternshipsHandler.ts

import type { JobHandler } from "@applyai/queue";
import type { ApplyUnstopInternshipPayload } from "@applyai/apply";
import { ApplyUnstopInternshipService } from "../../services/apply/ApplyUnstopInternshipService";

export class ApplyUnstopInternshipsHandler implements JobHandler<ApplyUnstopInternshipPayload> {
  private readonly applyUnstopInternshipService =
    new ApplyUnstopInternshipService();
  async execute(payload: ApplyUnstopInternshipPayload): Promise<void> {
    await this.applyUnstopInternshipService.apply(payload);
  }
}
