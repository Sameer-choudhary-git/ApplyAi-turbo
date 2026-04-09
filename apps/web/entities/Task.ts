// Task entity
export interface Task {
  title: string;
  description: string;
  due_date?: string; // ISO date
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  related_application_id?: string;
  category?: 'interview_prep' | 'document' | 'follow_up' | 'skill_building' | 'other';
}
