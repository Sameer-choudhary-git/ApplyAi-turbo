export const JobNames = {
  APPLY: {
    APPLY_UNSTOP_INTERNSHIPS: "ApplyUnstopInternships",
    QUEUE_ELIGIBLE_USERS: "QueueEligibleUsers",
    GREENHOUSE_SELECTION: "GreenhouseApplicationSelection",
    GREENHOUSE_AUTOFILL: "GreenhouseApplicationAutofill",
  },

  EXTRACT: {
    UNSTOP_INTERNSHIPS: "ExtractUnstopInternships",
    COMMUDLE: "ExtractCommudle",
    GREENHOUSE_DISCOVERY: "GreenhouseDiscovery",
  },

  VALIDATION: {
    UNSTOP: "ValidateUnstop",
  },

  CLEANUP: {
    EXPIRED_SESSIONS: "CleanupExpiredSessions",
  },

  JOB_SKILL: {
    COORDINATE: "JobSkillCoordinate",
    SEARCH: "JobSkillSearch",
    MATERIALS: "JobSkillMaterials",
    REPORT: "JobSkillReport",
  },
} as const;

export type ExtractJobNames =
  (typeof JobNames.EXTRACT)[keyof typeof JobNames.EXTRACT];
export type ApplyJobNames =
  (typeof JobNames.APPLY)[keyof typeof JobNames.APPLY];
export type JobSkillJobNames =
  (typeof JobNames.JOB_SKILL)[keyof typeof JobNames.JOB_SKILL];
