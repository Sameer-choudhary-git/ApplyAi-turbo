import { ExtractJob } from "./ExtractJob";
import { JobNames } from "../JobNames";

export class ExtractCommudleJob extends ExtractJob<{}> {
  constructor() {
    super(JobNames.EXTRACT.COMMUDLE, {});
  }
}
