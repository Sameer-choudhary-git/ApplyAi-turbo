// Application entity
export interface Application {
  title: string;
  company: string;
  type: 'internship' | 'job' | 'hackathon' | 'competition';
  platform: string;
  status?: 'applied' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'accepted' | 'rejected' | 'withdrawn';
  applied_date?: string; // ISO date
  deadline?: string; // ISO date
}
