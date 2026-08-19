import { api } from "@/lib/api";

export interface Entitlement {
  id?: string;
  tierKey: string;
  tierName: string;
  description: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
}

export function getMyEntitlement(): Promise<{ success: boolean; entitlement: Entitlement | null }> {
  return api("/entitlements/me");
}

export function redeemAccessCode(code: string): Promise<{ success: boolean; idempotent: boolean; entitlement: Entitlement }> {
  return api("/entitlements/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
