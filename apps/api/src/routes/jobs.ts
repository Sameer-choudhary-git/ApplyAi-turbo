import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth.js";

export const jobRoutes = new Hono();

jobRoutes.use("*", authMiddleware);

// ── List internships (with filters + pagination) ───────────
const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),           // "Full Time" | "Part Time"
  location: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

jobRoutes.get(
  "/internships",
  zValidator("query", listSchema),
  async (c) => {
    const { page, limit, search, type, location, isActive } =
      c.req.valid("query");

    const skip = (page - 1) * limit;

    const where = {
      isActive,
      ...(type && { type }),
      ...(location && {
        location: { contains: location, mode: "insensitive" as const },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [internships, total] = await prisma.$transaction([
      prisma.unstop_internships.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.unstop_internships.count({ where }),
    ]);

    return c.json({
      success: true,
      data: internships,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// ── Get single internship ──────────────────────────────────
jobRoutes.get("/internships/:id", async (c) => {
  const id = c.req.param("id");

  const internship = await prisma.unstop_internships.findUnique({
    where: { id },
  });

  if (!internship) {
    return c.json({ success: false, error: "Not found" }, 404);
  }

  return c.json({ success: true, data: internship });
});