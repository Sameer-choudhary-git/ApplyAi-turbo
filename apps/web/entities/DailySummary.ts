// DailySummary entity
export interface DailySummary {
  date: string; // ISO date
  applications_sent?: number;
  responses_received?: number;
  interviews_scheduled?: number;
  highlights?: string[];
  platforms_used?: string[];
  ai_insights?: string;
}
