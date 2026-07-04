import { JobHandler } from "@applyai/queue";
import { ValidationService } from "../../services/validation/ValidationService";

export class ValidateUnstopHandler implements JobHandler {
  private readonly validationService = new ValidationService();

  async execute(): Promise<void> {
    await this.validationService.validateUnstopInternships();
  }
}
