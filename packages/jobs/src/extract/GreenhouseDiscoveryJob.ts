import { ExtractJob } from "./ExtractJob";
import { JobNames } from "../JobNames";

export class GreenhouseDiscoveryJob extends ExtractJob<Record<string, never>> {
  constructor() {
    super(JobNames.EXTRACT.GREENHOUSE_DISCOVERY, {});
  }
}
