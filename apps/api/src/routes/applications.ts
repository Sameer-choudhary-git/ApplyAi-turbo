import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import { getCached, setCached, deleteCachedPattern } from "../lib/cache.js";
import { syncEventToGoogle } from "../lib/google-calendar-sync";

const interviewStatusSchema = z.object({
  receivedInterview: z.boolean(),
});

// ✅ Keep this list in sync with EDITABLE_STATUSES in ApplicationRow.tsx.
// Enforcing an enum here (rather than accepting any string) is what stops
// free-text typos like "Aplied" from ever reaching the DB in the first place,
// and keeps the value always lowercase/normalized so ApplicationRow's status
// lookup never has to guess at casing again.
const APPLICATION_STATUSES = [
  "applied",
  "already_applied",
  "under_review",
  "action_required",
  "shortlisted",
  "interview_scheduled",
  "accepted",
  "rejected",
  "error",
  "withdrawn",
] as const;

const statusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

const scheduleActionSchema = z.object({
  kind: z.enum(["interview", "task", "reminder"]),
  title: z.string().optional(),
  description: z.string().optional(),

  // interview fields
  interviewAt: z.string().optional(),
  durationMinutes: z.number().optional(),
  round: z.string().optional(),
  meetingUrl: z.string().optional(),

  // task fields
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

  // reminder fields
  remindAt: z.string().optional(),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
});
export const applicationsRouter = new Hono();

// GET /api/applications
applicationsRouter.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  try {
    // Check cache first
    const cacheKey = `applications:${userId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, data: cached });
    }

    const applications = await prisma.user_job_applications.findMany({
      where: { userId },

      include: {
        interviews: {
          orderBy: {
            interviewAt: "asc",
          },
          take: 1,
          select: {
            id: true,
            title: true,
            round: true,
            interviewAt: true,
            status: true,
          },
        },
      },

      orderBy: {
        appliedAt: "desc",
      },
    });

    // Cache the result for 5 minutes
    await setCached(cacheKey, applications, 300);

    return c.json({ success: true, data: applications });
  } catch (err) {
    console.error("GET /api/applications error:", err);
    return c.json(
      { success: false, error: "Failed to fetch applications" },
      500,
    );
  }
});

/**
 * PATCH /api/applications/:id/status
 * Manually correct/update an application's status (e.g. fixing a
 * mislabeled ACTION_REQUIRED/ERROR/ALREADY_APPLIED entry from the agent).
 */
applicationsRouter.patch("/:id/status", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const body = statusUpdateSchema.parse(await c.req.json());

    const application = await prisma.user_job_applications.findFirst({
      where: { id, userId },
    });

    if (!application) {
      return c.json(
        { success: false, error: "Application not found" },
        404,
      );
    }

    const updated = await prisma.user_job_applications.update({
      where: { id },
      data: {
        status: body.status,
        // statusUpdatedAt is @updatedAt in the schema, so Prisma bumps it
        // automatically on this write — no need to set it explicitly.
      },
    });

    // Invalidate cache so the next GET reflects the corrected status
    await deleteCachedPattern(`applications:${userId}*`);

    return c.json({ success: true, application: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.flatten() }, 400);
    }

    console.error("PATCH /:id/status error:", err);
    return c.json(
      { success: false, error: "Failed to update status" },
      500,
    );
  }
});

/**
 * PATCH /api/applications/:id/interview-status
 * Mark whether an interview has been received
 */
applicationsRouter.patch("/:id/interview-status", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    const id = c.req.param("id");

    const body = interviewStatusSchema.parse(await c.req.json());

    const application = await prisma.user_job_applications.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!application) {
      return c.json(
        {
          success: false,
          error: "Application not found",
        },
        404,
      );
    }

    const updated = await prisma.user_job_applications.update({
      where: {
        id,
      },
      data: {
        interviewScheduled: body.receivedInterview,

        lastInterviewAt: body.receivedInterview
          ? application.lastInterviewAt
          : null,
      },
    });

    // Invalidate cache
    await deleteCachedPattern(`applications:${userId}*`);

    return c.json({
      success: true,
      application: updated,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: err.flatten(),
        },
        400,
      );
    }

    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to update interview status",
      },
      500,
    );
  }
});

/**
 * POST /api/applications/:id/schedule
 * Create an interview, follow-up task, or reminder tied to this application.
 */
applicationsRouter.post("/:id/schedule", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

    const appId = c.req.param("id");
    const body = scheduleActionSchema.parse(await c.req.json());

    const app = await prisma.user_job_applications.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return c.json({ success: false, error: "Application not found" }, 404);
    }

    // ── Interview ──────────────────────────────────────────────────────
    if (body.kind === "interview") {
      if (!body.interviewAt) {
        return c.json(
          { success: false, error: "interviewAt is required" },
          400,
        );
      }

      const interview = await prisma.user_interviews.create({
        data: {
          userId,
          applicationId: appId,
          title: body.title || `Interview — ${app.jobTitle}`,
          company: app.company,
          interviewAt: new Date(body.interviewAt),
          duration: body.durationMinutes || null,
          round: body.round || null,
          meetingUrl: body.meetingUrl || null,
          notes: body.description || null,
        },
      });

      await prisma.user_job_applications.update({
        where: { id: appId },
        data: {
          interviewScheduled: true,
          lastInterviewAt: interview.interviewAt,
        },
      });

      await deleteCachedPattern(`applications:${userId}*`);

      syncEventToGoogle(userId, "user_interviews", {
        id: interview.id,
        title: interview.title,
        description: interview.notes,
        location: interview.meetingUrl,
        start: interview.interviewAt,
        durationMinutes: interview.duration || 60,
      }).catch((err) =>
        console.error("Google sync failed for interview:", err),
      );

      return c.json({ success: true, data: interview }, 201);
    }

    // ── Follow-up task ────────────────────────────────────────────────
    if (body.kind === "task") {
      const task = await prisma.user_tasks.create({
        data: {
          userId,
          title: body.title || `Follow up — ${app.jobTitle}`,
          description: body.description || null,
          priority: body.priority || "MEDIUM",
          category: "FOLLOW_UP",
          source: "APPLICATION",
          sourceId: appId,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      });

      if (task.dueDate) {
        syncEventToGoogle(userId, "user_tasks", {
          id: task.id,
          title: task.title,
          description: task.description,
          start: task.dueDate,
        }).catch((err) => console.error("Google sync failed for task:", err));
      }

      return c.json({ success: true, data: task }, 201);
    }

    // ── Reminder (default) ───────────────────────────────────────────
    if (body.kind === "reminder") {
      if (!body.remindAt) {
        return c.json({ success: false, error: "remindAt is required" }, 400);
      }

      const reminder = await prisma.user_reminders.create({
        data: {
          userId,
          title: body.title || `${app.jobTitle} — reminder`,
          description: body.description || null,
          location: body.location || null,
          remindAt: new Date(body.remindAt),
          endAt: body.endAt ? new Date(body.endAt) : null,
          allDay: body.allDay || false,
          sourceType: "application",
          sourceId: appId,
        },
      });

      syncEventToGoogle(userId, "user_reminders", {
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        location: reminder.location,
        start: reminder.remindAt,
        end: reminder.endAt || undefined,
        allDay: reminder.allDay,
      }).catch((err) => console.error("Google sync failed for reminder:", err));

      return c.json({ success: true, data: reminder }, 201);
    }

    // Zod's enum already blocks anything else from reaching here,
    // but keep a fallback for safety.
    return c.json({ success: false, error: "Invalid kind" }, 400);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.flatten() }, 400);
    }

    console.error("POST /:id/schedule error:", err);
    return c.json({ success: false, error: "Failed to schedule item" }, 500);
  }
});