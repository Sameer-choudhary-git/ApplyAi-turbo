import { ExtractJobNames, JobNames } from "@applyai/jobs";

import { ExtractCommudleHandler } from "../handlers/extract/ExtractCommudleHandler";
import { ExtractUnstopInternshipsHandler } from "../handlers/extract/ExtractUnstopInternshipsHandler";
import { GreenhouseDiscoveryHandler } from "../handlers/greenhouse/GreenhouseDiscoveryHandler";

import { JobHandler } from "../../../../packages/queue/src/workerFactory";

export const extractRegistry = new Map<ExtractJobNames, JobHandler>([
  [JobNames.EXTRACT.UNSTOP_INTERNSHIPS, new ExtractUnstopInternshipsHandler()],
  [JobNames.EXTRACT.COMMUDLE, new ExtractCommudleHandler()],
  [JobNames.EXTRACT.GREENHOUSE_DISCOVERY, new GreenhouseDiscoveryHandler()],
]);
