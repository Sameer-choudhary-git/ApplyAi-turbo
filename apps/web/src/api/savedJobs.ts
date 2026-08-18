import { api } from "@/lib/api";

export type SavedJobStatus = "saved" | "applied" | "ignored";
export type SavedJobType = "internship" | "job" | "hackathon" | "competition";

export interface SavedJob {
  id: string;
  title: string;
  company: string;
  url: string | null;
  location: string | null;
  work_mode: string | null;
  stipend: string | null;
  type: SavedJobType;
  source_site: string | null;
  notes: string | null;
  status: SavedJobStatus;
  description: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedJobInput {
  title: string;
  company: string;
  url?: string;
  location?: string;
  work_mode?: string;
  stipend?: string;
  type?: SavedJobType;
  source_site?: string;
  notes?: string;
  status?: SavedJobStatus;
  description?: string;
  deadline?: string;
}

export function listSavedJobs(params?: {
  search?: string;
  status?: SavedJobStatus;
}): Promise<SavedJob[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return api<SavedJob[]>(`/saved-jobs${suffix}`);
}

export function createSavedJob(input: SavedJobInput): Promise<SavedJob> {
  return api<SavedJob>("/saved-jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSavedJob(id: string, input: Partial<SavedJobInput>): Promise<SavedJob> {
  return api<SavedJob>(`/saved-jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSavedJob(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/saved-jobs/${id}`, { method: "DELETE" });
}
