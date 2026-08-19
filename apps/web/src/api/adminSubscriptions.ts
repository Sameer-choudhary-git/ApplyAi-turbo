import { api } from "@/lib/api";

export interface SubscriptionPlan {
  key: string;
  name: string;
  description: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  displayOrder: number;
  isPublic: boolean;
}

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
  hasOverrides: boolean;
  createdAt: string;
}

export interface SubscriptionCustomer {
  id: string;
  fullName: string;
  email: string;
  isOnboarded: boolean;
  entitlement: { id?: string; tierKey: string; tierName: string; status: string; endsAt: string | null; features: Record<string, unknown>; limits: Record<string, unknown> } | null;
}

export interface SubscriptionAuditEvent {
  id: string;
  action: string;
  userId: string | null;
  actorUserId: string | null;
  entitlementId: string | null;
  codeId: string | null;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  createdAt: string;
}

export function listSubscriptionPlans(): Promise<{ success: boolean; plans: SubscriptionPlan[] }> {
  return api("/admin/subscription-codes/plans");
}

export function listSubscriptionCustomers(search?: string): Promise<{ success: boolean; customers: SubscriptionCustomer[] }> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
  return api(`/admin/subscription-codes/customers${suffix}`);
}

export function listSubscriptionCodes(): Promise<{ success: boolean; codes: SubscriptionCodeSummary[] }> {
  return api("/admin/subscription-codes");
}

export function createSubscriptionCode(input: { tierKey: string; maxRedemptions: number; expiresAt?: string; note?: string; featureOverrides?: Record<string, unknown>; limitOverrides?: Record<string, unknown> }): Promise<{ success: boolean; code: { id: string; value: string; tierKey: string; tierName: string; maxRedemptions: number; expiresAt: string | null; note: string | null; featureOverrides?: Record<string, unknown> | null; limitOverrides?: Record<string, unknown> | null } }> {
  return api("/admin/subscription-codes", { method: "POST", body: JSON.stringify(input) });
}

export function revokeSubscriptionCode(id: string): Promise<{ success: boolean }> {
  return api(`/admin/subscription-codes/${id}/revoke`, { method: "PATCH" });
}

export function assignCustomerPlan(userId: string, input: { tierKey: string; endsAt?: string | null; note?: string; featureOverrides?: Record<string, unknown>; limitOverrides?: Record<string, unknown> }): Promise<{ success: boolean; entitlement: SubscriptionCustomer["entitlement"] }> {
  return api(`/admin/subscription-codes/customers/${userId}/assign`, { method: "POST", body: JSON.stringify(input) });
}

export function updateCustomerEntitlement(id: string, input: { status?: string; endsAt?: string | null; note?: string; featureOverrides?: Record<string, unknown>; limitOverrides?: Record<string, unknown> }): Promise<{ success: boolean; entitlement: SubscriptionCustomer["entitlement"] }> {
  return api(`/admin/subscription-codes/entitlements/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function revokeCustomerEntitlement(id: string): Promise<{ success: boolean }> {
  return api(`/admin/subscription-codes/entitlements/${id}/revoke`, { method: "POST" });
}

export function getCustomerSubscriptionAudit(userId: string): Promise<{ success: boolean; events: SubscriptionAuditEvent[] }> {
  return api(`/admin/subscription-codes/customers/${userId}/audit`);
}
