// apps/worker/src/handlers/apply/QueueEligibleUsersHandler.ts

import type { JobHandler } from "@applyai/queue";
import { EligibilityService } from "../../services/apply/EligibilityService";

export class QueueEligibleUsersHandler implements JobHandler {
  private readonly eligibilityService = new EligibilityService();

  async execute(): Promise<void> {
    await this.eligibilityService.queueEligibleUsers();
  }
}
