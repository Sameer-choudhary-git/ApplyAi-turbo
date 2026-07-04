import { validateUnstopInternships } from "../../../packages/core/validation/src/unstop/unstopInternshipValidator";
export async function validateJobs() {
  console.log("🔎 Validating old job applications...");
  await validateUnstopInternships();
}
