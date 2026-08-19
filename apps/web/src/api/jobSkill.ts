import { api } from "@/lib/api";

export interface JobSkillOpportunity {
  id: string;
  provider: string;
  externalId: string | null;
  canonicalUrl: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  salary: string | null;
  description: string | null;
  postedAt: string | null;
  fitnessScore: number | null;
  scoreReason: string | null;
  status: string;
  savedJobId: string | null;
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts?: Array<{ id: string; kind: string; fileName: string; publicUrl: string | null; status: string }>;
}

export interface JobSkillRun {
  id: string;
  triggerType: string;
  status: string;
  providerCount: number;
  foundCount: number;
  generatedCount: number;
  errorSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts?: Array<{ id: string; kind: string; fileName: string; publicUrl: string | null; status: string }>;
}

export interface JobSkillSchedule {
  id: string;
  userId: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  providerKeys: string[];
  roles: string[];
  locations: string[];
  companyTypes: string[];
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  maxResults: number;
  materialLimit: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export function getJobSkillProviders(): Promise<{ success: boolean; providers: Array<{ key: string; enabled: boolean; configured: boolean }> }> {
  return api("/job-skill/providers");
}

export function listJobSkillRuns(): Promise<{ success: boolean; runs: JobSkillRun[] }> {
  return api("/job-skill/runs");
}

export function listJobSkillOpportunities(params?: { search?: string; minScore?: number }): Promise<{ success: boolean; opportunities: JobSkillOpportunity[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.minScore) query.set("minScore", String(params.minScore));
  return api(`/job-skill/opportunities${query.toString() ? `?${query.toString()}` : ""}`);
}

export function startJobSkillRun(input: { roles: string[]; locations: string[]; providerKeys?: string[]; maxResults?: number; materialLimit?: number }): Promise<{ success: boolean; run: JobSkillRun }> {
  return api("/job-skill/runs", { method: "POST", body: JSON.stringify(input) });
}

export function saveJobSkillOpportunity(id: string): Promise<{ success: boolean }> {
  return api(`/job-skill/opportunities/${id}/save`, { method: "POST" });
}

export function applyToJobSkillOpportunity(id: string): Promise<{ success: boolean }> {
  return api(`/job-skill/opportunities/${id}/apply`, { method: "POST" });
}

export function getJobSkillSchedule(): Promise<{ success: boolean; schedule: JobSkillSchedule | null }> {
  return api("/job-skill/schedule");
}

export function saveJobSkillSchedule(input: Partial<JobSkillSchedule>): Promise<{ success: boolean; schedule: JobSkillSchedule }> {
  return api("/job-skill/schedule", { method: "PUT", body: JSON.stringify(input) });
}
