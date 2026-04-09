// UserProfile entity
export interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  resume_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  education?: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    start_date: string;
    end_date?: string;
  }>;
}
