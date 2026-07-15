import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import { getCached, setCached, deleteCachedPattern } from "../lib/cache.js";
import { syncEventToGoogle, deleteEventFromGoogle } from "../lib/google-calendar-sync";

export const scheduleRouter = new Hono();

const reminderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  remindAt: z.string(), // ISO datetime
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

const reminderUpdateSchema = reminderSchema.partial();

// GET /api/schedule — aggregate tasks, interviews, reminders, upcoming deadlines
scheduleRouter.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  try {
    const cacheKey = `schedule:${userId}`;
    const cached = await getCached(cacheKey);
    if (cached) return c.json({ success: true, events: cached });

    const [tasks, interviews, reminders, upcomingDeadlines] = await Promise.all([
      prisma.user_tasks.findMany({ where: { userId, dueDate: { not: null } } }),
      prisma.user_interviews.findMany({ where: { userId } }),
      prisma.user_reminders.findMany({ where: { userId, status: "PENDING" } }),
      prisma.user_job_applications.findMany({
        where: { userId, deadline: { not: null, gte: new Date() } },
      }),
    ]);

    const events = [
      ...tasks.map((t) => ({
        id: t.id,
        type: "TASK" as const,
        title: t.title,
        description: t.description,
        start: t.dueDate,
        company: null,
        sourceId: t.id,
      })),
      ...interviews.map((i) => ({
        id: i.id,
        type: "INTERVIEW" as const,
        title: i.title,
        description: i.notes,
        location: i.meetingUrl,
        start: i.interviewAt,
        company: i.company,
        sourceId: i.id,
      })),
      ...reminders.map((r) => ({
        id: r.id,
        type: "REMINDER" as const,
        title: r.title,
        description: r.description,
        location: r.location,
        start: r.remindAt,
        end: r.endAt,
        allDay: r.allDay,
        company: null,
        sourceId: r.id,
      })),
      ...upcomingDeadlines.map((a) => ({
        id: `deadline-${a.id}`,
        type: "DEADLINE" as const,
        title: `${a.jobTitle} — deadline`,
        start: a.deadline,
        company: a.company,
        sourceId: a.id,
      })),
    ];

    await setCached(cacheKey, events, 60);
    return c.json({ success: true, events });
  } catch (err) {
    console.error("GET /api/schedule error:", err);
    return c.json({ success: false, error: "Failed to fetch schedule" }, 500);
  }
});

// POST /api/schedule/reminders
scheduleRouter.post("/reminders", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

    const body = reminderSchema.parse(await c.req.json());

    const reminder = await prisma.user_reminders.create({
      data: {
        userId,
        title: body.title,
        description: body.description || null,
        location: body.location || null,
        remindAt: new Date(body.remindAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        allDay: body.allDay || false,
        sourceType: body.sourceType || "manual",
        sourceId: body.sourceId || null,
      },
    });

    await deleteCachedPattern(`schedule:${userId}*`);

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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.flatten() }, 400);
    }
    console.error("POST /schedule/reminders error:", err);
    return c.json({ success: false, error: "Failed to create reminder" }, 500);
  }
});

// PATCH /api/schedule/reminders/:id
scheduleRouter.patch("/reminders/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    const id = c.req.param("id");
    const body = reminderUpdateSchema.parse(await c.req.json());

    const existing = await prisma.user_reminders.findFirst({ where: { id, userId } });
    if (!existing) return c.json({ success: false, error: "Reminder not found" }, 404);

    const reminder = await prisma.user_reminders.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.remindAt !== undefined && { remindAt: new Date(body.remindAt) }),
        ...(body.endAt !== undefined && { endAt: body.endAt ? new Date(body.endAt) : null }),
        ...(body.allDay !== undefined && { allDay: body.allDay }),
      },
    });

    await deleteCachedPattern(`schedule:${userId}*`);

    syncEventToGoogle(
      userId,
      "user_reminders",
      {
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        location: reminder.location,
        start: reminder.remindAt,
        end: reminder.endAt || undefined,
        allDay: reminder.allDay,
      },
      reminder.googleEventId,
    ).catch((err) => console.error("Google sync failed for reminder update:", err));

    return c.json({ success: true, data: reminder });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.flatten() }, 400);
    }
    console.error("PATCH /schedule/reminders/:id error:", err);
    return c.json({ success: false, error: "Failed to update reminder" }, 500);
  }
});

// DELETE /api/schedule/reminders/:id
scheduleRouter.delete("/reminders/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId") as string;
    const id = c.req.param("id");

    const reminder = await prisma.user_reminders.findFirst({ where: { id, userId } });
    if (!reminder) return c.json({ success: false, error: "Reminder not found" }, 404);

    await deleteEventFromGoogle(userId, reminder.googleEventId);
    await prisma.user_reminders.delete({ where: { id } });
    await deleteCachedPattern(`schedule:${userId}*`);

    return c.json({ success: true });
  } catch (err) {
    console.error("DELETE /schedule/reminders/:id error:", err);
    return c.json({ success: false, error: "Failed to delete reminder" }, 500);
  }
});

export default scheduleRouter;