import { api } from "@/lib/api";

export interface Entitlement {
  id?: string;
  tierKey: string;
  tierName: string;
  description: string | null;
  status: string;
  sourceType?: string;
  startsAt: string | null;
  endsAt: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  note?: string | null;
}

export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  displayOrder: number;
  isPublic: boolean;
}

export function getMyEntitlement(): Promise<{ success: boolean; entitlement: Entitlement | null }> {
  return api("/entitlements/me");
}

export function getPublicPlans(): Promise<{ success: boolean; plans: PublicPlan[] }> {
  return api("/entitlements/plans");
}

export function getMyUsage(): Promise<{ success: boolean; usage: Record<string, { used: number; limit: number; remaining: number } | null> }> {
  return api("/entitlements/usage");
}

export function redeemAccessCode(code: string): Promise<{ success: boolean; idempotent: boolean; entitlement: Entitlement }> {
  return api("/entitlements/redeem", { method: "POST", body: JSON.stringify({ code }) });
}
