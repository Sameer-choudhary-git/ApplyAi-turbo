import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { deleteCachedPattern, getCached, setCached } from "../lib/cache";
import { hasFeature, reserveUsage } from "../lib/entitlements";

export const savedJobsRouter = new Hono();

const STATUS_VALUES = ["saved", "applied", "ignored"] as const;
const TYPE_VALUES = ["internship", "job", "hackathon", "competition"] as const;
type SavedJobStatus = (typeof STATUS_VALUES)[number];

savedJobsRouter.use("*", authMiddleware);

function getUserId(c: Parameters<typeof authMiddleware>[0]): string | null {
  const userId = c.get("userId");
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

function parseDeadline(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const input = stringValue(value);
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serialize(job: any) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    location: job.location,
    work_mode: job.workMode,
    stipend: job.stipend,
    type: job.type,
    source_site: job.sourceSite,
    notes: job.notes,
    status: job.status,
    description: job.description,
    deadline: job.deadline,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

function cacheKey(userId: string, search = "", status = "") {
  return `saved-jobs:${userId}:${search}:${status}`;
}

function validateStatus(value: unknown): value is SavedJobStatus {
  return typeof value === "string" && STATUS_VALUES.includes(value as SavedJobStatus);
}

function validateType(value: unknown): value is (typeof TYPE_VALUES)[number] {
  return typeof value === "string" && TYPE_VALUES.includes(value as (typeof TYPE_VALUES)[number]);
}

// GET /api/saved-jobs?search=&status=
savedJobsRouter.get("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const search = c.req.query("search")?.trim() ?? "";
  const status = c.req.query("status")?.trim() ?? "";
  const cached = await getCached<any[]>(cacheKey(userId, search, status));
  if (cached) return c.json(cached);

  const where: any = { userId };
  if (validateStatus(status)) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { sourceSite: { contains: search, mode: "insensitive" } },
    ];
  }

  const jobs = await prisma.user_saved_jobs.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const result = jobs.map(serialize);
  await setCached(cacheKey(userId, search, status), result, 60);
  return c.json(result);
});

// POST /api/saved-jobs
savedJobsRouter.post("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (!(await hasFeature(userId, "saved_jobs"))) return c.json({ success: false, error: "Saved jobs are not available on your current plan" }, 403);
  const body = await c.req.json();
  const title = stringValue(body.title);
  const company = stringValue(body.company);
  if (!title) return c.json({ success: false, error: "Job title is required" }, 400);
  if (!company) return c.json({ success: false, error: "Company is required" }, 400);
  if (body.type !== undefined && !validateType(body.type)) return c.json({ success: false, error: "Invalid job type" }, 400);
  if (body.status !== undefined && !validateStatus(body.status)) return c.json({ success: false, error: "Invalid job status" }, 400);

  const url = stringValue(body.url);
  if (url) {
    const duplicate = await prisma.user_saved_jobs.findFirst({ where: { userId, url } });
    if (duplicate) return c.json({ success: false, error: "This job is already saved" }, 409);
  }

  const deadline = parseDeadline(body.deadline);
  if (body.deadline !== undefined && deadline === undefined) return c.json({ success: false, error: "Invalid deadline" }, 400);

  try {
    await reserveUsage(userId, "saved_jobs");
  } catch {
    return c.json({ success: false, error: "Your saved-job limit has been reached" }, 429);
  }

  const job = await prisma.user_saved_jobs.create({
    data: {
      userId,
      title,
      company,
      url,
      location: stringValue(body.location),
      workMode: stringValue(body.work_mode ?? body.workMode),
      stipend: stringValue(body.stipend),
      type: body.type || "job",
      sourceSite: stringValue(body.source_site ?? body.sourceSite),
      notes: stringValue(body.notes),
      status: body.status || "saved",
      description: stringValue(body.description),
      deadline: deadline ?? null,
    },
  });

  await deleteCachedPattern(`saved-jobs:${userId}:*`);
  return c.json(serialize(job), 201);
});

// PATCH /api/saved-jobs/:id
savedJobsRouter.patch("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.user_saved_jobs.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ success: false, error: "Saved job not found" }, 404);

  const body = await c.req.json();
  if (body.type !== undefined && !validateType(body.type)) return c.json({ success: false, error: "Invalid job type" }, 400);
  if (body.status !== undefined && !validateStatus(body.status)) return c.json({ success: false, error: "Invalid job status" }, 400);

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = stringValue(body.title);
    if (!title) return c.json({ success: false, error: "Job title is required" }, 400);
    data.title = title;
  }
  if (body.company !== undefined) {
    const company = stringValue(body.company);
    if (!company) return c.json({ success: false, error: "Company is required" }, 400);
    data.company = company;
  }
  if (body.url !== undefined) data.url = stringValue(body.url);
  if (body.location !== undefined) data.location = stringValue(body.location);
  if (body.work_mode !== undefined || body.workMode !== undefined) data.workMode = stringValue(body.work_mode ?? body.workMode);
  if (body.stipend !== undefined) data.stipend = stringValue(body.stipend);
  if (body.type !== undefined) data.type = body.type;
  if (body.source_site !== undefined || body.sourceSite !== undefined) data.sourceSite = stringValue(body.source_site ?? body.sourceSite);
  if (body.notes !== undefined) data.notes = stringValue(body.notes);
  if (body.status !== undefined) data.status = body.status;
  if (body.description !== undefined) data.description = stringValue(body.description);
  if (body.deadline !== undefined) {
    const deadline = parseDeadline(body.deadline);
    if (deadline === undefined) return c.json({ success: false, error: "Invalid deadline" }, 400);
    data.deadline = deadline;
  }

  const nextUrl = data.url === undefined ? existing.url : data.url;
  if (typeof nextUrl === "string" && nextUrl.length > 0) {
    const duplicate = await prisma.user_saved_jobs.findFirst({ where: { userId, url: nextUrl, NOT: { id } } });
    if (duplicate) return c.json({ success: false, error: "This job is already saved" }, 409);
  }

  const job = await prisma.user_saved_jobs.update({ where: { id }, data });
  await deleteCachedPattern(`saved-jobs:${userId}:*`);
  return c.json(serialize(job));
});

// DELETE /api/saved-jobs/:id
savedJobsRouter.delete("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const existing = await prisma.user_saved_jobs.findFirst({ where: { id, userId } });
  if (!existing) return c.json({ success: false, error: "Saved job not found" }, 404);

  await prisma.user_saved_jobs.delete({ where: { id } });
  await deleteCachedPattern(`saved-jobs:${userId}:*`);
  return c.json({ success: true });
});

export default savedJobsRouter;
