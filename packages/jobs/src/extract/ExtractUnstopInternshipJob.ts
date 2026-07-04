import { ExtractJob } from "./ExtractJob";
import { JobNames } from "../JobNames";

export class ExtractUnstopInternshipsJob extends ExtractJob<{}> {
  constructor() {
    super(JobNames.EXTRACT.UNSTOP_INTERNSHIPS, {});
  }
}
