import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { getCached, setCached, deleteCachedPattern } from "../lib/cache";

export const networking = new Hono();

const RELATIONSHIP_VALUES = ["recruiter", "peer", "mentor", "alumni", "referral", "other"] as const;
const STATUS_VALUES = ["connected", "pending", "following", "met"] as const;
const PLATFORM_VALUES = ["LinkedIn", "Unstop", "GitHub", "Twitter", "Email", "Event", "Other"] as const;

// Every networking operation is user-scoped. In particular, this prevents a
// write from reaching Prisma without the userId populated by authMiddleware.
networking.use("*", authMiddleware);

function getUserId(c: Parameters<typeof authMiddleware>[0]): string | null {
  const userId = c.get("userId");
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function serialize(contact: any) {
  return {
    ...contact,
    relationships: Array.isArray(contact.relationships) ? contact.relationships : [],
    tags: Array.isArray(contact.tags) ? contact.tags : [],
  };
}

function normalizedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

// GET /api/networking — list contacts (with search + filter)
networking.get("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const search = c.req.query("search")?.trim();
  const relationship = c.req.query("relationship");
  const status = c.req.query("status");
  const cacheKey = `networking:${userId}:${search ?? ""}:${relationship ?? ""}:${status ?? ""}`;
  const cached = await getCached<any[]>(cacheKey);
  if (cached) return c.json(cached);

  const where: any = { userId };
  if (status && STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  let contacts = await prisma.user_networking_contacts.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  if (relationship && relationship !== "all" && RELATIONSHIP_VALUES.includes(relationship as (typeof RELATIONSHIP_VALUES)[number])) {
    contacts = contacts.filter((contact) =>
      Array.isArray(contact.relationships) && (contact.relationships as string[]).includes(relationship),
    );
  }

  const result = contacts.map(serialize);
  await setCached(cacheKey, result, 60);
  return c.json(result);
});

// GET /api/networking/stats — dashboard counters
networking.get("/stats", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const cacheKey = `networking:${userId}:stats`;
  const cached = await getCached(cacheKey);
  if (cached) return c.json(cached);

  const contacts = await prisma.user_networking_contacts.findMany({
    where: { userId },
    select: { relationships: true, status: true, referralPotential: true },
  });

  const stats = {
    total: contacts.length,
    recruiters: contacts.filter(
      (contact) => Array.isArray(contact.relationships) && (contact.relationships as string[]).includes("recruiter"),
    ).length,
    referralPotential: contacts.filter((contact) => contact.referralPotential).length,
    pending: contacts.filter((contact) => contact.status === "pending").length,
  };

  await setCached(cacheKey, stats, 60);
  return c.json(stats);
});

// GET /api/networking/:id — single contact
networking.get("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const contact = await prisma.user_networking_contacts.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!contact) return c.json({ error: "Contact not found" }, 404);
  return c.json(serialize(contact));
});

// POST /api/networking — create contact
networking.post("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const name = normalizedString(body.name);
  if (!name) return c.json({ error: "Name is required" }, 400);
  if (body.platform && !PLATFORM_VALUES.includes(body.platform)) {
    return c.json({ error: "Invalid platform" }, 400);
  }
  if (body.status && !STATUS_VALUES.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const relationships = Array.isArray(body.relationships)
    ? body.relationships.filter((value: unknown): value is string =>
        typeof value === "string" && RELATIONSHIP_VALUES.includes(value as (typeof RELATIONSHIP_VALUES)[number]),
      )
    : [];

  const contact = await prisma.user_networking_contacts.create({
    data: {
      userId,
      name,
      title: normalizedString(body.title),
      company: normalizedString(body.company),
      email: normalizedString(body.email),
      profileUrl: normalizedString(body.profile_url ?? body.profileUrl),
      platform: body.platform || "LinkedIn",
      relationships,
      status: body.status || "connected",
      notes: normalizedString(body.notes),
      referralPotential: Boolean(body.referral_potential ?? body.referralPotential),
      tags: Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === "string") : [],
    },
  });

  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json(serialize(contact), 201);
});

// PATCH /api/networking/:id/pin — toggle pin
networking.patch("/:id/pin", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.user_networking_contacts.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ error: "Contact not found" }, 404);

  const contact = await prisma.user_networking_contacts.update({
    where: { id },
    data: { pinned: !existing.pinned },
  });
  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json(serialize(contact));
});

// PATCH /api/networking/:id — update contact
networking.patch("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await prisma.user_networking_contacts.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ error: "Contact not found" }, 404);

  if (body.platform && !PLATFORM_VALUES.includes(body.platform)) return c.json({ error: "Invalid platform" }, 400);
  if (body.status && !STATUS_VALUES.includes(body.status)) return c.json({ error: "Invalid status" }, 400);

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = normalizedString(body.name);
    if (!name) return c.json({ error: "Name is required" }, 400);
    data.name = name;
  }
  if (body.title !== undefined) data.title = normalizedString(body.title);
  if (body.company !== undefined) data.company = normalizedString(body.company);
  if (body.email !== undefined) data.email = normalizedString(body.email);
  if (body.profile_url !== undefined || body.profileUrl !== undefined) data.profileUrl = normalizedString(body.profile_url ?? body.profileUrl);
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = normalizedString(body.notes);
  if (body.referral_potential !== undefined || body.referralPotential !== undefined) data.referralPotential = Boolean(body.referral_potential ?? body.referralPotential);
  if (body.relationships !== undefined) {
    data.relationships = Array.isArray(body.relationships)
      ? body.relationships.filter((value: unknown): value is string => typeof value === "string" && RELATIONSHIP_VALUES.includes(value as (typeof RELATIONSHIP_VALUES)[number]))
      : [];
  }
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === "string") : [];
  if (body.pinned !== undefined) data.pinned = Boolean(body.pinned);

  const contact = await prisma.user_networking_contacts.update({ where: { id }, data });
  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json(serialize(contact));
});

// DELETE /api/networking/:id
networking.delete("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.user_networking_contacts.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ error: "Contact not found" }, 404);

  await prisma.user_networking_contacts.delete({ where: { id } });
  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json({ success: true });
});

export default networking;

// Keep this function exported for route-level tests and integrations that need
// to verify the accepted values without duplicating them.
export const networkingOptions = {
  relationships: [...RELATIONSHIP_VALUES],
  statuses: [...STATUS_VALUES],
  platforms: [...PLATFORM_VALUES],
};

