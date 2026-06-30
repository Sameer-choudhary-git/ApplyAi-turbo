import { ValidateJob } from './JobBase';
import { validateUnstopInternships } from '../utils/validator/unstop/unstopInternshipValidator';

const validateUnstopPayload = validateUnstopInternships;
export const validateUnstop = new ValidateJob(validateUnstopPayload, "ValidateUnstopJob");

