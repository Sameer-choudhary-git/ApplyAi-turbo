// Contact entity
export interface Contact {
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin_url: string;
  platform?: 'LinkedIn' | 'Unstop' | 'GitHub' | 'Twitter' | 'Email' | 'Event' | 'Other';
  relationship?: 'recruiter' | 'peer' | 'mentor' | 'alumni' | 'referral' | 'other';
}
