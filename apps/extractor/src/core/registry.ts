// core/registry.ts

import { unstopInternships } from "../platforms/unstop/internship"
import { commudleEvents } from "../platforms/commudle/events"

export const extractors = [
  unstopInternships,
  commudleEvents
]