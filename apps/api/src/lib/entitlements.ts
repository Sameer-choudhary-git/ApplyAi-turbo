import { prisma } from "@applyai/db";

export type EntitlementRecord = {
  id: string;
  userId: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  tier: {
    key: string;
    name: string;
    description: string | null;
    features: unknown;
    limits: unknown;
  };
  featuresSnapshot: unknown;
  limitsSnapshot: unknown;
};

export const FREE_TIER_KEY = "free";
export const JOB_SKILL_TIER_KEY = "job_skill";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function featureEnabled(entitlement: EntitlementRecord | null, feature: string): boolean {
  if (!entitlement) return false;
  if (entitlement.tier.key === "admin") return true;
  const snapshot = isRecord(entitlement.featuresSnapshot) ? entitlement.featuresSnapshot : {};
  const tierFeatures = isRecord(entitlement.tier.features) ? entitlement.tier.features : {};
  return snapshot[feature] === true || tierFeatures[feature] === true;
}

export function getEntitlementLimit(entitlement: EntitlementRecord | null, limit: string, fallback: number): number {
  if (!entitlement) return fallback;
  const snapshot = isRecord(entitlement.limitsSnapshot) ? entitlement.limitsSnapshot : {};
  const tierLimits = isRecord(entitlement.tier.limits) ? entitlement.tier.limits : {};
  const value = snapshot[limit] ?? tierLimits[limit];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function getEffectiveEntitlement(userId: string): Promise<EntitlementRecord | null> {
  const now = new Date();
  return prisma.user_entitlements.findFirst({
    where: {
      userId,
      status: "active",
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      tier: { is: { isActive: true } },
    },
    include: { tier: true },
    orderBy: { startsAt: "desc" },
  }) as Promise<EntitlementRecord | null>;
}

export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  const entitlement = await getEffectiveEntitlement(userId);
  return featureEnabled(entitlement, feature);
}
