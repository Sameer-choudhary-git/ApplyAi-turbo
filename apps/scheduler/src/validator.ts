import {validateUnstopInternships} from "./unstop/unstopInternshipValidator";
export async function validateJobs() {
    console.log("🔎 Validating old job applications...");
    await validateUnstopInternships();
}