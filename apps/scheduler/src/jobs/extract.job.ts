import { ExtractJob } from './JobBase';
import { extractors } from '@applyai/extractor';

const extractUnstopInternshipJobPayload = extractors.unstopInternships;
export const extractUnstopInternship = new ExtractJob(extractUnstopInternshipJobPayload, "ExtractUnstopInternshipJob");

const commudleEventsJobPayload = extractors.commudleEvents;
export const extractCommudleEvents = new ExtractJob(commudleEventsJobPayload, "ExtractCommudleEventsJob");