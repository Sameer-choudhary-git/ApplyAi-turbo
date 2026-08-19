import { randomUUID } from "node:crypto";
import { prisma } from "@applyai/db";

export type EntitlementRecord = {
  id: string;
  userId: string;
  status: string;
  sourceType: string;
  startsAt: Date;
  endsAt: Date | null;
  note: string | null;
  grantedByUserId: string | null;
  tier: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    features: unknown;
    limits: unknown;
    displayOrder?: number;
    isPublic?: boolean;
  };
  featuresSnapshot: unknown;
  limitsSnapshot: unknown;
  featureOverrides?: unknown;
  limitOverrides?: unknown;
};

export const FREE_TIER_KEY = "free";
export const PRO_TIER_KEY = "pro";
export const MAX_TIER_KEY = "max";
export const JOB_SKILL_TIER_KEY = "job_skill";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergedObject(...values: unknown[]): Record<string, unknown> {
  return values.reduce<Record<string, unknown>>((result, value) => {
    if (isRecord(value)) Object.assign(result, value);
    return result;
  }, {});
}

export function resolvedFeatures(entitlement: EntitlementRecord | null): Record<string, unknown> {
  if (!entitlement) return {};
  return mergedObject(entitlement.tier.features, entitlement.featuresSnapshot, entitlement.featureOverrides);
}

export function resolvedLimits(entitlement: EntitlementRecord | null): Record<string, unknown> {
  if (!entitlement) return {};
  return mergedObject(entitlement.tier.limits, entitlement.limitsSnapshot, entitlement.limitOverrides);
}

export function featureEnabled(entitlement: EntitlementRecord | null, feature: string): boolean {
  if (!entitlement) return false;
  if (entitlement.tier.key === "admin") return true;
  return resolvedFeatures(entitlement)[feature] === true;
}

export function getEntitlementLimit(entitlement: EntitlementRecord | null, limit: string, fallback: number): number {
  if (!entitlement) return fallback;
  const value = resolvedLimits(entitlement)[limit];
  if (value === -1 || value === "unlimited") return Number.POSITIVE_INFINITY;
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
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  }) as Promise<EntitlementRecord | null>;
}

export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  const entitlement = await getEffectiveEntitlement(userId);
  return featureEnabled(entitlement, feature);
}

function periodFor(date = new Date()): { key: string; start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`, start, end };
}

export type UsageReservation = {
  entitlementId: string;
  metric: string;
  periodKey: string;
  used: number;
  limit: number;
  remaining: number;
};

export async function reserveUsage(userId: string, metric: string, amount = 1): Promise<UsageReservation> {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Usage amount must be a positive integer");
  const entitlement = await getEffectiveEntitlement(userId);
  if (!entitlement) throw new Error("An active plan is required");
  const limit = getEntitlementLimit(entitlement, metric, 0);
  const period = periodFor();
  if (limit === Number.POSITIVE_INFINITY) {
    return { entitlementId: entitlement.id, metric, periodKey: period.key, used: 0, limit: -1, remaining: -1 };
  }
  if (limit <= 0) throw new Error(`Plan limit reached for ${metric}`);

  const rows = await prisma.$queryRaw<Array<{ used: number }>>`
    INSERT INTO "subscription_usage" ("id", "userId", "entitlementId", "metric", "periodKey", "used", "periodStart", "periodEnd", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${entitlement.id}, ${metric}, ${period.key}, ${amount}, ${period.start}, ${period.end}, NOW(), NOW())
    ON CONFLICT ("entitlementId", "metric", "periodKey") DO UPDATE
      SET "used" = "subscription_usage"."used" + ${amount}, "updatedAt" = NOW()
      WHERE "subscription_usage"."used" + ${amount} <= ${limit}
    RETURNING "used"
  `;
  if (!rows[0]) throw new Error(`Plan limit reached for ${metric}`);
  const used = Number(rows[0].used);
  return { entitlementId: entitlement.id, metric, periodKey: period.key, used, limit, remaining: Math.max(limit - used, 0) };
}

export async function getUsage(userId: string, metric: string): Promise<UsageReservation | null> {
  const entitlement = await getEffectiveEntitlement(userId);
  if (!entitlement) return null;
  const period = periodFor();
  const row = await prisma.subscription_usage.findUnique({ where: { entitlementId_metric_periodKey: { entitlementId: entitlement.id, metric, periodKey: period.key } } });
  const resolvedLimit = getEntitlementLimit(entitlement, metric, 0);
  const limit = resolvedLimit === Number.POSITIVE_INFINITY ? -1 : resolvedLimit;
  return { entitlementId: entitlement.id, metric, periodKey: period.key, used: row?.used ?? 0, limit, remaining: limit === -1 ? -1 : Math.max(limit - (row?.used ?? 0), 0) };
}

export function entitlementToPublic(entitlement: EntitlementRecord | null) {
  if (!entitlement) return null;
  return {
    id: entitlement.id,
    tierKey: entitlement.tier.key,
    tierName: entitlement.tier.name,
    description: entitlement.tier.description,
    status: entitlement.status,
    sourceType: entitlement.sourceType,
    startsAt: entitlement.startsAt,
    endsAt: entitlement.endsAt,
    features: resolvedFeatures(entitlement),
    limits: resolvedLimits(entitlement),
    note: entitlement.note,
  };
}
