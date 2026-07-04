import { validateUnstopInternships } from "@applyai/validation";
export class ValidationService {
  async validateUnstopInternships() {
    return await validateUnstopInternships();
  }
}
