export interface Application {
  id: string;

  platform: string;

  company: string;

  jobTitle: string;

  jobLink: string;

  status: string;

  notes?: string | null;

  type?: string | null;

  success_probability?: number | null;

  location?: string | null;

  appliedAt: string;

  deadline?: string | null;

  interviewScheduled: boolean;

  lastInterviewAt?: string | null;

 interviews?: {
    id: string;

    title: string;

    round?: string | null;

    interviewAt: string;

    status: string;

    meetingUrl?: string | null;
}[];
}
