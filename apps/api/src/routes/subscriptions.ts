import { createHash, randomBytes } from "node:crypto";
import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { isAdminUser } from "../lib/admin";
import { entitlementToPublic, getEffectiveEntitlement, getUsage, resolvedFeatures, resolvedLimits } from "../lib/entitlements";

export const subscriptionRouter = new Hono();
export const adminSubscriptionRouter = new Hono();

function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 16 ? code : null;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function publicTier(tier: any) {
  return {
    key: tier.key,
    name: tier.name,
    description: tier.description,
    features: tier.features,
    limits: tier.limits,
    displayOrder: tier.displayOrder ?? 0,
    isPublic: tier.isPublic ?? true,
  };
}

function normalizeTierKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return key === "job_skill" ? "pro" : key;
}

function requireAdmin(c: Parameters<typeof authMiddleware>[0]): string | null {
  const userId = c.get("userId");
  if (typeof userId !== "string" || !isAdminUser(userId)) return null;
  return userId;
}

subscriptionRouter.get("/plans", authMiddleware, async (c) => {
  const tiers = await prisma.subscription_tiers.findMany({ where: { isActive: true, isPublic: true }, orderBy: { displayOrder: "asc" } });
  return c.json({ success: true, plans: tiers.map(publicTier) });
});

subscriptionRouter.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  const entitlement = await getEffectiveEntitlement(userId);
  if (entitlement) return c.json({ success: true, entitlement: entitlementToPublic(entitlement) });

  const freeTier = await prisma.subscription_tiers.findUnique({ where: { key: "free" } });
  return c.json({ success: true, entitlement: freeTier ? { tierKey: freeTier.key, tierName: freeTier.name, description: freeTier.description, status: "active", sourceType: "default", startsAt: null, endsAt: null, features: freeTier.features, limits: freeTier.limits } : null });
});

subscriptionRouter.get("/usage", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  const metrics = ["manual_runs_per_month", "applications_per_month", "resume_generations_per_month", "cover_letter_generations_per_month", "saved_jobs", "networking_contacts"];
  const usage = await Promise.all(metrics.map(async (metric) => [metric, await getUsage(userId, metric)] as const));
  return c.json({ success: true, usage: Object.fromEntries(usage) });
});

subscriptionRouter.post("/redeem", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => ({}));
  const normalized = normalizeCode(body.code);
  if (!normalized) return c.json({ success: false, error: "A valid access code is required" }, 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const code = await tx.subscription_access_codes.findUnique({ where: { codeHash: hashCode(normalized) }, include: { tier: true } });
      if (!code) throw new Error("INVALID_CODE");
      const existing = await tx.subscription_redemptions.findUnique({ where: { codeId_userId: { codeId: code.id, userId } }, include: { entitlement: { include: { tier: true } } } });
      if (existing?.entitlement) return { entitlement: existing.entitlement, idempotent: true };
      if (!code.tier.isActive || code.revokedAt || (code.expiresAt && code.expiresAt <= new Date())) throw new Error("CODE_UNAVAILABLE");

      const claimed = await tx.subscription_access_codes.updateMany({ where: { id: code.id, revokedAt: null, redemptionCount: { lt: code.maxRedemptions }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, data: { redemptionCount: { increment: 1 } } });
      if (claimed.count !== 1) throw new Error("CODE_UNAVAILABLE");

      await tx.user_entitlements.updateMany({ where: { userId, status: "active" }, data: { status: "replaced", endsAt: new Date() } });
      const redemption = await tx.subscription_redemptions.create({ data: { codeId: code.id, userId, tierKey: code.tier.key } });
      const entitlement = await tx.user_entitlements.create({ data: { userId, tierId: code.tierId, sourceRedemptionId: redemption.id, sourceType: "code", status: "active", endsAt: code.expiresAt, featuresSnapshot: (code.tier.features ?? {}) as any, limitsSnapshot: (code.tier.limits ?? {}) as any, featureOverrides: (code.featureOverrides ?? undefined) as any, limitOverrides: (code.limitOverrides ?? undefined) as any, note: code.note }, include: { tier: true } });
      await tx.subscription_audit_events.create({ data: { userId, entitlementId: entitlement.id, codeId: code.id, action: "redeemed", afterSnapshot: { tierKey: code.tier.key, features: code.tier.features, limits: code.tier.limits } as any } });
      return { entitlement, idempotent: false };
    });
    return c.json({ success: true, idempotent: result.idempotent, entitlement: entitlementToPublic(result.entitlement as any) }, result.idempotent ? 200 : 201);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "INVALID_CODE") return c.json({ success: false, error: "Invalid access code" }, 404);
    if (reason === "CODE_UNAVAILABLE") return c.json({ success: false, error: "This access code is expired, revoked, or fully redeemed" }, 409);
    console.error("Access-code redemption failed:", error);
    return c.json({ success: false, error: "Could not redeem access code" }, 500);
  }
});

adminSubscriptionRouter.use("*", authMiddleware);

adminSubscriptionRouter.get("/plans", async (c) => {
  if (!requireAdmin(c)) return c.json({ success: false, error: "Forbidden" }, 403);
  const tiers = await prisma.subscription_tiers.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
  return c.json({ success: true, plans: tiers.map(publicTier) });
});

adminSubscriptionRouter.get("/customers", async (c) => {
  if (!requireAdmin(c)) return c.json({ success: false, error: "Forbidden" }, 403);
  const search = c.req.query("search")?.trim();
  const users = await prisma.users.findMany({ where: search ? { OR: [{ email: { contains: search, mode: "insensitive" } }, { fullName: { contains: search, mode: "insensitive" } }] } : undefined, select: { id: true, fullName: true, email: true, isOnboarded: true, entitlements: { where: { status: "active" }, include: { tier: true }, orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }], take: 1 } }, orderBy: { createdAt: "desc" }, take: 200 });
  return c.json({ success: true, customers: users.map((user) => ({ id: user.id, fullName: user.fullName, email: user.email, isOnboarded: user.isOnboarded, entitlement: user.entitlements[0] ? entitlementToPublic(user.entitlements[0] as any) : null })) });
});

adminSubscriptionRouter.get("/", async (c) => {
  if (!requireAdmin(c)) return c.json({ success: false, error: "Forbidden" }, 403);
  const codes = await prisma.subscription_access_codes.findMany({ include: { tier: true }, orderBy: { createdAt: "desc" } });
  return c.json({ success: true, codes: codes.map((code) => ({ id: code.id, tierKey: code.tier.key, tierName: code.tier.name, codePrefix: code.codePrefix, maxRedemptions: code.maxRedemptions, redemptionCount: code.redemptionCount, expiresAt: code.expiresAt, revokedAt: code.revokedAt, note: code.note, hasOverrides: Boolean(code.featureOverrides || code.limitOverrides), createdAt: code.createdAt })) });
});

adminSubscriptionRouter.post("/", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const tierKey = normalizeTierKey(body.tierKey);
  const maxRedemptions = Number(body.maxRedemptions ?? 1);
  if (!tierKey || !Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100000) return c.json({ success: false, error: "tierKey and a valid maxRedemptions are required" }, 400);
  const tier = await prisma.subscription_tiers.findUnique({ where: { key: tierKey } });
  if (!tier || !tier.isActive) return c.json({ success: false, error: "Unknown or inactive tier" }, 400);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return c.json({ success: false, error: "Invalid expiresAt" }, 400);
  const featureOverrides = jsonObject(body.featureOverrides);
  const limitOverrides = jsonObject(body.limitOverrides);
  const generated = `APPLY-${randomBytes(15).toString("base64url").toUpperCase()}`;
  const code = await prisma.subscription_access_codes.create({ data: { tierId: tier.id, codeHash: hashCode(normalizeCode(generated)!), codePrefix: generated.slice(0, 12), maxRedemptions, expiresAt, note: typeof body.note === "string" ? body.note.trim() || null : null, featureOverrides: featureOverrides as any, limitOverrides: limitOverrides as any, createdByUserId: adminId } });
  await prisma.subscription_audit_events.create({ data: { actorUserId: adminId, codeId: code.id, action: "code_created", afterSnapshot: { tierKey: tier.key, maxRedemptions, expiresAt: expiresAt?.toISOString() ?? null, featureOverrides, limitOverrides } as any } });
  return c.json({ success: true, code: { id: code.id, value: generated, tierKey: tier.key, tierName: tier.name, maxRedemptions: code.maxRedemptions, expiresAt: code.expiresAt, note: code.note, featureOverrides, limitOverrides } }, 201);
});

adminSubscriptionRouter.post("/customers/:userId/assign", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);
  const userId = c.req.param("userId");
  const body = await c.req.json().catch(() => ({}));
  const tierKey = normalizeTierKey(body.tierKey);
  if (!tierKey) return c.json({ success: false, error: "tierKey is required" }, 400);
  const tier = await prisma.subscription_tiers.findUnique({ where: { key: tierKey } });
  if (!tier || !tier.isActive) return c.json({ success: false, error: "Unknown or inactive tier" }, 400);
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) return c.json({ success: false, error: "Invalid endsAt" }, 400);
  const featureOverrides = jsonObject(body.featureOverrides);
  const limitOverrides = jsonObject(body.limitOverrides);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    const previous = await tx.user_entitlements.findFirst({ where: { userId, status: "active" }, include: { tier: true }, orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }] });
    await tx.user_entitlements.updateMany({ where: { userId, status: "active" }, data: { status: "replaced", endsAt: new Date() } });
    const entitlement = await tx.user_entitlements.create({ data: { userId, tierId: tier.id, sourceType: "admin", status: "active", endsAt, featuresSnapshot: (tier.features ?? {}) as any, limitsSnapshot: (tier.limits ?? {}) as any, featureOverrides: featureOverrides as any, limitOverrides: limitOverrides as any, note: typeof body.note === "string" ? body.note.trim() || null : null, grantedByUserId: adminId }, include: { tier: true } });
    await tx.subscription_audit_events.create({ data: { actorUserId: adminId, userId, entitlementId: entitlement.id, action: "plan_assigned", beforeSnapshot: previous ? { tierKey: previous.tier.key, status: previous.status, limits: previous.limitsSnapshot } as any : undefined, afterSnapshot: { tierKey: tier.key, endsAt: endsAt?.toISOString() ?? null, featureOverrides, limitOverrides } as any } });
    return entitlement;
  }).catch((error) => { if (error instanceof Error && error.message === "USER_NOT_FOUND") return null; throw error; });
  if (!result) return c.json({ success: false, error: "User not found" }, 404);
  return c.json({ success: true, entitlement: entitlementToPublic(result as any) }, 201);
});

adminSubscriptionRouter.patch("/entitlements/:id", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const current = await prisma.user_entitlements.findUnique({ where: { id }, include: { tier: true } });
  if (!current) return c.json({ success: false, error: "Entitlement not found" }, 404);
  const featureOverrides = body.featureOverrides === undefined ? undefined : jsonObject(body.featureOverrides);
  const limitOverrides = body.limitOverrides === undefined ? undefined : jsonObject(body.limitOverrides);
  const endsAt = body.endsAt === null || body.endsAt === "" ? null : body.endsAt ? new Date(body.endsAt) : undefined;
  if (endsAt && Number.isNaN(endsAt.getTime())) return c.json({ success: false, error: "Invalid endsAt" }, 400);
  const data: any = { status: typeof body.status === "string" && ["active", "paused", "revoked"].includes(body.status) ? body.status : undefined, endsAt, featureOverrides: featureOverrides as any, limitOverrides: limitOverrides as any, note: typeof body.note === "string" ? body.note.trim() || null : undefined };
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user_entitlements.update({ where: { id }, data, include: { tier: true } });
    await tx.subscription_audit_events.create({ data: { actorUserId: adminId, userId: current.userId, entitlementId: id, action: "entitlement_updated", beforeSnapshot: { status: current.status, endsAt: current.endsAt?.toISOString() ?? null, featureOverrides: current.featureOverrides, limitOverrides: current.limitOverrides } as any, afterSnapshot: { status: next.status, endsAt: next.endsAt?.toISOString() ?? null, featureOverrides: next.featureOverrides, limitOverrides: next.limitOverrides } as any } });
    return next;
  });
  return c.json({ success: true, entitlement: entitlementToPublic(updated as any) });
});

adminSubscriptionRouter.post("/entitlements/:id/revoke", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const current = await prisma.user_entitlements.findUnique({ where: { id }, include: { tier: true } });
  if (!current) return c.json({ success: false, error: "Entitlement not found" }, 404);
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user_entitlements.update({ where: { id }, data: { status: "revoked", endsAt: new Date() }, include: { tier: true } });
    await tx.subscription_audit_events.create({ data: { actorUserId: adminId, userId: current.userId, entitlementId: id, action: "entitlement_revoked", beforeSnapshot: { status: current.status, tierKey: current.tier.key } as any, afterSnapshot: { status: next.status, endsAt: next.endsAt?.toISOString() ?? null } as any } });
    return next;
  });
  return c.json({ success: true, entitlement: entitlementToPublic(updated as any) });
});

adminSubscriptionRouter.get("/customers/:userId/audit", async (c) => {
  if (!requireAdmin(c)) return c.json({ success: false, error: "Forbidden" }, 403);
  const events = await prisma.subscription_audit_events.findMany({ where: { userId: c.req.param("userId") }, orderBy: { createdAt: "desc" }, take: 200 });
  return c.json({ success: true, events });
});

adminSubscriptionRouter.patch("/:id/revoke", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const updated = await prisma.subscription_access_codes.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (updated.count !== 1) return c.json({ success: false, error: "Code not found or already revoked" }, 404);
  await prisma.subscription_audit_events.create({ data: { actorUserId: adminId, codeId: id, action: "code_revoked", afterSnapshot: { revokedAt: new Date() } as any } });
  return c.json({ success: true });
});
