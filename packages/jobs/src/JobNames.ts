export const JobNames = {
  APPLY: {
    APPLY_UNSTOP_INTERNSHIPS: "ApplyUnstopInternships",
    QUEUE_ELIGIBLE_USERS: "QueueEligibleUsers",
  },

  EXTRACT: {
    UNSTOP_INTERNSHIPS: "ExtractUnstopInternships",
    COMMUDLE: "ExtractCommudle",
  },

  VALIDATION: {
    UNSTOP: "ValidateUnstop",
  },

  CLEANUP: {
    EXPIRED_SESSIONS: "CleanupExpiredSessions",
  },
} as const;

export type ExtractJobNames =
  (typeof JobNames.EXTRACT)[keyof typeof JobNames.EXTRACT];
export type ApplyJobNames =
  (typeof JobNames.APPLY)[keyof typeof JobNames.APPLY];
