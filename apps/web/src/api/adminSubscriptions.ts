import { api } from "@/lib/api";

export interface SubscriptionCodeSummary {
  id: string;
  tierKey: string;
  tierName: string;
  codePrefix: string;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  note: string | null;
  createdAt: string;
}

export function listSubscriptionCodes(): Promise<{ success: boolean; codes: SubscriptionCodeSummary[] }> {
  return api("/admin/subscription-codes");
}

export function createSubscriptionCode(input: {
  tierKey: string;
  maxRedemptions: number;
  expiresAt?: string;
  note?: string;
}): Promise<{ success: boolean; code: { id: string; value: string; tierKey: string; tierName: string; maxRedemptions: number; expiresAt: string | null; note: string | null } }> {
  return api("/admin/subscription-codes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeSubscriptionCode(id: string): Promise<{ success: boolean }> {
  return api(`/admin/subscription-codes/${id}/revoke`, { method: "PATCH" });
}
