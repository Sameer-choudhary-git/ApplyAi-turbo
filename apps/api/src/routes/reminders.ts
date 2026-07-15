import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { ZodError } from "zod";
import {
  createReminderSchema,
  updateReminderSchema,
} from "../schemas/reminder";
import { getCached, setCached, deleteCached, deleteCachedPattern } from "../lib/cache.js";

const reminders = new Hono();

/**
 * GET /api/reminders
 */
reminders.get("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    // Check cache first
    const cacheKey = `reminders:${userId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, reminders: cached });
    }

    const remindersData = await prisma.task_reminders.findMany({
      where: {
        OR: [
          {
            task: {
              userId,
            },
          },
          {
            interview: {
              userId,
            },
          },
        ],
      },
      include: {
        task: true,
        interview: true,
      },
      orderBy: {
        reminderAt: "asc",
      },
    });

    // Cache the result for 5 minutes
    await setCached(cacheKey, remindersData, 300);

    return c.json({
      success: true,
      reminders: remindersData,
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to fetch reminders",
      },
      500,
    );
  }
});

reminders.post("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    const body = createReminderSchema.parse(await c.req.json());

    /**
     * Verify task ownership
     */
    if (body.taskId) {
      const task = await prisma.user_tasks.findFirst({
        where: {
          id: body.taskId,
          userId,
        },
      });

      if (!task) {
        return c.json(
          {
            success: false,
            error: "Task not found",
          },
          404,
        );
      }
    }

    /**
     * Verify interview ownership
     */
    if (body.interviewId) {
      const interview =
        await prisma.user_interviews.findFirst({
          where: {
            id: body.interviewId,
            userId,
          },
        });

      if (!interview) {
        return c.json(
          {
            success: false,
            error: "Interview not found",
          },
          404,
        );
      }
    }

    const reminder =
      await prisma.task_reminders.create({
        data: {
          taskId: body.taskId,

          interviewId: body.interviewId,

          reminderAt: body.reminderAt,

          type: body.type,
        },
      });

    // Invalidate cache
    await deleteCachedPattern(`reminders:${userId}*`);

    return c.json(
      {
        success: true,
        reminder,
      },
      201,
    );
  } catch (err) {
    if (err instanceof ZodError) {
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
        error: "Failed to create reminder",
      },
      500,
    );
  }
});

/**
 * GET /api/reminders/:id
 */
reminders.get("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    // Check cache first
    const cacheKey = `reminders:${userId}:${id}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, reminder: cached });
    }

    const reminder = await prisma.task_reminders.findFirst({
      where: {
        id,
        OR: [
          {
            task: {
              userId,
            },
          },
          {
            interview: {
              userId,
            },
          },
        ],
      },
      include: {
        task: true,
        interview: true,
      },
    });

    if (!reminder) {
      return c.json(
        {
          success: false,
          error: "Reminder not found",
        },
        404,
      );
    }

    // Cache the result for 5 minutes
    await setCached(cacheKey, reminder, 300);

    return c.json({
      success: true,
      reminder,
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to fetch reminder",
      },
      500,
    );
  }
});

/**
 * PATCH /api/reminders/:id
 */
reminders.patch("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const body = updateReminderSchema.parse(await c.req.json());

    const reminder = await prisma.task_reminders.findFirst({
      where: {
        id,
        OR: [
          {
            task: {
              userId,
            },
          },
          {
            interview: {
              userId,
            },
          },
        ],
      },
    });

    if (!reminder) {
      return c.json(
        {
          success: false,
          error: "Reminder not found",
        },
        404,
      );
    }

    const updated = await prisma.task_reminders.update({
      where: {
        id,
      },
      data: {
        ...body,
      },
    });

    // Invalidate cache
    await deleteCached(`reminders:${userId}:${id}`);
    await deleteCachedPattern(`reminders:${userId}*`);

    return c.json({
      success: true,
      reminder: updated,
    });
  } catch (err) {
    if (err instanceof ZodError) {
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
        error: "Failed to update reminder",
      },
      500,
    );
  }
});

/**
 * DELETE /api/reminders/:id
 */
reminders.delete("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const reminder = await prisma.task_reminders.findFirst({
      where: {
        id,
        OR: [
          {
            task: {
              userId,
            },
          },
          {
            interview: {
              userId,
            },
          },
        ],
      },
    });

    if (!reminder) {
      return c.json(
        {
          success: false,
          error: "Reminder not found",
        },
        404,
      );
    }

    await prisma.task_reminders.delete({
      where: {
        id,
      },
    });

    // Invalidate cache
    await deleteCached(`reminders:${userId}:${id}`);
    await deleteCachedPattern(`reminders:${userId}*`);

    return c.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to delete reminder",
      },
      500,
    );
  }
});

export default reminders;