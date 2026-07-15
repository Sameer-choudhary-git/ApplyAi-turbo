import { api } from "@/lib/api"; 

export interface Contact {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  profileUrl: string | null;
  platform: string;
  relationships: string[];
  status: string;
  notes: string | null;
  referralPotential: boolean;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  recruiters: number;
  referralPotential: number;
  pending: number;
}

export interface ContactInput {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  profile_url?: string;
  platform?: string;
  relationships?: string[];
  status?: string;
  notes?: string;
  referral_potential?: boolean;
  tags?: string[];
}

export function listContacts(params?: {
  search?: string;
  relationship?: string;
  status?: string;
}): Promise<Contact[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.relationship && params.relationship !== "all") qs.set("relationship", params.relationship);
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return api<Contact[]>(`/networking${query ? `?${query}` : ""}`);
}

export function getContactStats(): Promise<ContactStats> {
  return api<ContactStats>("/networking/stats");
}

export function createContact(input: ContactInput): Promise<Contact> {
  return api<Contact>("/networking", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateContact(id: string, input: Partial<ContactInput>): Promise<Contact> {
  return api<Contact>(`/networking/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteContact(id: string): Promise<{ success: boolean }> {
  return api(`/networking/${id}`, { method: "DELETE" });
}

export function togglePinContact(id: string): Promise<Contact> {
  return api<Contact>(`/networking/${id}/pin`, { method: "PATCH" });
}