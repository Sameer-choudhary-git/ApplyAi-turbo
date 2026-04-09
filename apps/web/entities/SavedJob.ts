// SavedJob entity
export interface SavedJob {
  title: string;
  company: string;
  url: string;
  location: string;
  work_mode: string;
  stipend: string;
  deadline?: string; // ISO date
  type?: 'internship' | 'job' | 'hackathon' | 'competition';
  source_site?: string;
  notes?: string;
}
