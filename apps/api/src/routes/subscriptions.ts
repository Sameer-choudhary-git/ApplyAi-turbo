import { randomBytes, createHash } from "node:crypto";
import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { isAdminUser } from "../lib/admin";
import { getEffectiveEntitlement } from "../lib/entitlements";

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

function asPublicEntitlement(entitlement: any) {
  if (!entitlement) return null;
  return {
    id: entitlement.id,
    tierKey: entitlement.tier.key,
    tierName: entitlement.tier.name,
    description: entitlement.tier.description,
    status: entitlement.status,
    startsAt: entitlement.startsAt,
    endsAt: entitlement.endsAt,
    features: entitlement.featuresSnapshot ?? entitlement.tier.features,
    limits: entitlement.limitsSnapshot ?? entitlement.tier.limits,
  };
}

function requireAdmin(c: Parameters<typeof authMiddleware>[0]): string | null {
  const userId = c.get("userId");
  if (typeof userId !== "string" || !isAdminUser(userId)) return null;
  return userId;
}

subscriptionRouter.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  const entitlement = await getEffectiveEntitlement(userId);
  if (entitlement) return c.json({ success: true, entitlement: asPublicEntitlement(entitlement) });

  const freeTier = await prisma.subscription_tiers.findUnique({ where: { key: "free" } });
  return c.json({
    success: true,
    entitlement: freeTier
      ? {
          tierKey: freeTier.key,
          tierName: freeTier.name,
          description: freeTier.description,
          status: "active",
          startsAt: null,
          endsAt: null,
          features: freeTier.features,
          limits: freeTier.limits,
        }
      : null,
  });
});

subscriptionRouter.post("/redeem", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => ({}));
  const normalized = normalizeCode(body.code);
  if (!normalized) return c.json({ success: false, error: "A valid access code is required" }, 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const code = await tx.subscription_access_codes.findUnique({
        where: { codeHash: hashCode(normalized) },
        include: { tier: true },
      });
      if (!code) throw new Error("INVALID_CODE");

      const existing = await tx.subscription_redemptions.findUnique({
        where: { codeId_userId: { codeId: code.id, userId } },
        include: { entitlement: { include: { tier: true } } },
      });
      if (existing?.entitlement) return { entitlement: existing.entitlement, idempotent: true };
      if (!code.tier.isActive || code.revokedAt || (code.expiresAt && code.expiresAt <= new Date())) {
        throw new Error("CODE_UNAVAILABLE");
      }

      const claimed = await tx.subscription_access_codes.updateMany({
        where: {
          id: code.id,
          revokedAt: null,
          redemptionCount: { lt: code.maxRedemptions },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { redemptionCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error("CODE_UNAVAILABLE");

      const redemption = await tx.subscription_redemptions.create({
        data: { codeId: code.id, userId, tierKey: code.tier.key },
      });
      const entitlement = await tx.user_entitlements.create({
        data: {
          userId,
          tierId: code.tierId,
          sourceRedemptionId: redemption.id,
          status: "active",
          endsAt: code.expiresAt,
          featuresSnapshot: (code.tier.features ?? {}) as any,
          limitsSnapshot: (code.tier.limits ?? {}) as any,
        },
        include: { tier: true },
      });
      return { entitlement, idempotent: false };
    });

    return c.json({ success: true, idempotent: result.idempotent, entitlement: asPublicEntitlement(result.entitlement) }, result.idempotent ? 200 : 201);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "INVALID_CODE") return c.json({ success: false, error: "Invalid access code" }, 404);
    if (reason === "CODE_UNAVAILABLE") return c.json({ success: false, error: "This access code is expired, revoked, or fully redeemed" }, 409);
    console.error("Access-code redemption failed:", error);
    return c.json({ success: false, error: "Could not redeem access code" }, 500);
  }
});

adminSubscriptionRouter.use("*", authMiddleware);

adminSubscriptionRouter.get("/", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);

  const codes = await prisma.subscription_access_codes.findMany({
    include: { tier: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json({
    success: true,
    codes: codes.map((code) => ({
      id: code.id,
      tierKey: code.tier.key,
      tierName: code.tier.name,
      codePrefix: code.codePrefix,
      maxRedemptions: code.maxRedemptions,
      redemptionCount: code.redemptionCount,
      expiresAt: code.expiresAt,
      revokedAt: code.revokedAt,
      note: code.note,
      createdAt: code.createdAt,
    })),
  });
});

adminSubscriptionRouter.post("/", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);

  const body = await c.req.json().catch(() => ({}));
  const tierKey = typeof body.tierKey === "string" ? body.tierKey.trim() : "";
  const maxRedemptions = Number(body.maxRedemptions ?? 1);
  if (!tierKey || !Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100000) {
    return c.json({ success: false, error: "tierKey and a valid maxRedemptions are required" }, 400);
  }

  const tier = await prisma.subscription_tiers.findUnique({ where: { key: tierKey } });
  if (!tier || !tier.isActive) return c.json({ success: false, error: "Unknown or inactive tier" }, 400);

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return c.json({ success: false, error: "Invalid expiresAt" }, 400);

  const generated = `APPLY-${randomBytes(15).toString("base64url").toUpperCase()}`;
  const code = await prisma.subscription_access_codes.create({
    data: {
      tierId: tier.id,
      codeHash: hashCode(normalizeCode(generated)!),
      codePrefix: generated.slice(0, 12),
      maxRedemptions,
      expiresAt,
      note: typeof body.note === "string" ? body.note.trim() || null : null,
      createdByUserId: adminId,
    },
  });

  // The plaintext is deliberately returned only in this creation response.
  return c.json({
    success: true,
    code: {
      id: code.id,
      value: generated,
      tierKey: tier.key,
      tierName: tier.name,
      maxRedemptions: code.maxRedemptions,
      expiresAt: code.expiresAt,
      note: code.note,
    },
  }, 201);
});

adminSubscriptionRouter.patch("/:id/revoke", async (c) => {
  const adminId = requireAdmin(c);
  if (!adminId) return c.json({ success: false, error: "Forbidden" }, 403);

  const id = c.req.param("id");
  const updated = await prisma.subscription_access_codes.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count !== 1) return c.json({ success: false, error: "Code not found or already revoked" }, 404);
  return c.json({ success: true });
});
