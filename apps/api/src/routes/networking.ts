import { Hono } from "hono";
import {prisma} from "@applyai/db"
import { authMiddleware } from "../middleware/auth";
import { getCached, setCached, deleteCachedPattern } from "../lib/cache";

export const networking = new Hono();


const RELATIONSHIP_VALUES = ["recruiter", "peer", "mentor", "alumni", "referral", "other"];
const STATUS_VALUES = ["connected", "pending", "following", "met"];
const PLATFORM_VALUES = ["LinkedIn", "Unstop", "GitHub", "Twitter", "Email", "Event", "Other"];

function serialize(contact: any) {
  return {
    ...contact,
    relationships: Array.isArray(contact.relationships) ? contact.relationships : [],
    tags: Array.isArray(contact.tags) ? contact.tags : [],
  };
}

// GET /api/networking — list contacts (with search + filter)
networking.get("/", authMiddleware, async (c) => {
  const userId = (c as any).get("userId") as string;
  const search = c.req.query("search")?.trim();
  const relationship = c.req.query("relationship");
  const status = c.req.query("status");

  const cacheKey = `networking:${userId}:${search ?? ""}:${relationship ?? ""}:${status ?? ""}`;
  const cached = await getCached<any[]>(cacheKey);
  if (cached) return c.json(cached);

  const where: any = { userId };

  if (status && STATUS_VALUES.includes(status)) {
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

  // relationships is JSON array — filter in app layer since Postgres JSON "array contains" 
  // needs raw query; fine at this scale, swap for a jsonb @> query if the table grows large.
  if (relationship && relationship !== "all" && RELATIONSHIP_VALUES.includes(relationship)) {
    contacts = contacts.filter((ct) =>
      Array.isArray(ct.relationships) && (ct.relationships as string[]).includes(relationship)
    );
  }

  const result = contacts.map(serialize);
  await setCached(cacheKey, result, 60);
  return c.json(result);
});

// GET /api/networking/stats — dashboard counters
networking.get("/stats", authMiddleware, async (c) => {
  const userId = (c as any).get("userId") as string;
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
      (ct) => Array.isArray(ct.relationships) && (ct.relationships as string[]).includes("recruiter")
    ).length,
    referralPotential: contacts.filter((ct) => ct.referralPotential).length,
    pending: contacts.filter((ct) => ct.status === "pending").length,
  };

  await setCached(cacheKey, stats, 60);
  return c.json(stats);
});

// GET /api/networking/:id — single contact
networking.get("/:id", authMiddleware, async (c) => {
  const userId = (c as any).get("userId") as string;
  const id = c.req.param("id");

  const contact = await prisma.user_networking_contacts.findFirst({
    where: { id, userId },
  });

  if (!contact) return c.json({ error: "Contact not found" }, 404);
  return c.json(serialize(contact));
});

// POST /api/networking — create contact
networking.post("/", async (c) => {
  const userId = (c as any).get("userId");
  const body = await c.req.json();

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  if (body.platform && !PLATFORM_VALUES.includes(body.platform)) {
    return c.json({ error: "Invalid platform" }, 400);
  }

  if (body.status && !STATUS_VALUES.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const relationships = Array.isArray(body.relationships)
    ? body.relationships.filter((r: string) => RELATIONSHIP_VALUES.includes(r))
    : [];

  const contact = await prisma.user_networking_contacts.create({
    data: {
      userId,
      name: body.name.trim(),
      title: body.title || null,
      company: body.company || null,
      email: body.email || null,
      profileUrl: body.profile_url || body.profileUrl || null,
      platform: body.platform || "LinkedIn",
      relationships,
      status: body.status || "connected",
      notes: body.notes || null,
      referralPotential: !!body.referral_potential || !!body.referralPotential,
      tags: Array.isArray(body.tags) ? body.tags : [],
    },
  });

  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json(serialize(contact), 201);
});


// PATCH /api/networking/:id/pin — toggle pin
networking.patch("/:id/pin", async (c) => {
  const userId = c.get("userId");
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
  const userId = (c as any).get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await prisma.user_networking_contacts.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ error: "Contact not found" }, 404);

  if (body.platform && !PLATFORM_VALUES.includes(body.platform)) {
    return c.json({ error: "Invalid platform" }, 400);
  }
  if (body.status && !STATUS_VALUES.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const data: any = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.title !== undefined) data.title = body.title || null;
  if (body.company !== undefined) data.company = body.company || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.profile_url !== undefined || body.profileUrl !== undefined) {
    data.profileUrl = body.profile_url ?? body.profileUrl ?? null;
  }
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.referral_potential !== undefined || body.referralPotential !== undefined) {
    data.referralPotential = !!(body.referral_potential ?? body.referralPotential);
  }
  if (body.relationships !== undefined) {
    data.relationships = Array.isArray(body.relationships)
      ? body.relationships.filter((r: string) => RELATIONSHIP_VALUES.includes(r))
      : [];
  }
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags) ? body.tags : [];
  }
  if (body.pinned !== undefined) data.pinned = !!body.pinned;

  const contact = await prisma.user_networking_contacts.update({
    where: { id },
    data,
  });

  await deleteCachedPattern(`networking:${userId}:*`);
  return c.json(serialize(contact));
});

// DELETE /api/networking/:id
networking.delete("/:id", async (c) => {
  const userId = (c as any).get("userId");
  const id = c.req.param("id");

  const existing = await prisma.user_networking_contacts.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ error: "Contact not found" }, 404);

  await prisma.user_networking_contacts.delete({ where: { id } });
  await deleteCachedPattern(`networking:${userId}:*`);

  return c.json({ success: true });
});

