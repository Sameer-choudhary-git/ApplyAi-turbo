import { JobNames } from "@applyai/jobs";
import { ValidateUnstopHandler } from "../handlers/validation/ValidateUnstopHandler";

export const validationRegistry = new Map([
  [JobNames.VALIDATION.UNSTOP, new ValidateUnstopHandler()],
]);
