import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { ZodError } from "zod";
import { createTaskSchema, updateTaskSchema } from "../schemas/task";
import { getCached, setCached, deleteCached, deleteCachedPattern } from "../lib/cache.js";

const tasks = new Hono();

/**
 * GET /api/tasks
 * Get all tasks for the logged-in user
 */
tasks.get("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    // Check cache first
    const cacheKey = `tasks:${userId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, tasks: cached });
    }

    const data = await prisma.user_tasks.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    // Cache the result for 5 minutes
    await setCached(cacheKey, data, 300);

    return c.json({
      success: true,
      tasks: data,
    });
  } catch (err) {
    console.error(err);
    return c.json(
      {
        success: false,
        error: "Failed to fetch tasks",
      },
      500,
    );
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
tasks.post("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    const body = createTaskSchema.parse(await c.req.json());

    const task = await prisma.user_tasks.create({
      data: {
        userId,

        title: body.title,

        description: body.description,

        priority: body.priority ?? "MEDIUM",

        category: body.category ?? "GENERAL",

        dueDate: body.dueDate,

        source: body.source ?? "MANUAL",

        sourceId: body.sourceId,
      },
    });

    // Invalidate cache
    await deleteCachedPattern(`tasks:${userId}*`);

    return c.json({
      success: true,
      task,
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
        error: "Failed to create task",
      },
      500,
    );
  }
});

/**
 * PATCH /api/tasks/:id
 * Update task
 */
tasks.patch("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const body = updateTaskSchema.parse(await c.req.json());

    const existing = await prisma.user_tasks.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Task not found",
        },
        404,
      );
    }

    const updateData: any = {
      ...body,
    };

    if (body.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    if (body.status === "PENDING") {
      updateData.completedAt = null;
    }

    const task = await prisma.user_tasks.update({
      where: {
        id,
      },
      data: updateData,
    });

    // Invalidate cache
    await deleteCached(`tasks:${userId}:${id}`);
    await deleteCachedPattern(`tasks:${userId}*`);

    return c.json({
      success: true,
      task,
    });
  } catch (err) {
    console.error(err);
    return c.json(
      {
        success: false,
        error: "Failed to update task",
      },
      500,
    );
  }
});

/**
 * DELETE /api/tasks/:id
 */
tasks.delete("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const existing = await prisma.user_tasks.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Task not found",
        },
        404,
      );
    }

    await prisma.user_tasks.delete({
      where: {
        id,
      },
    });

    // Invalidate cache
    await deleteCached(`tasks:${userId}:${id}`);
    await deleteCachedPattern(`tasks:${userId}*`);

    return c.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    return c.json(
      {
        success: false,
        error: "Failed to delete task",
      },
      500,
    );
  }
});

// GET /tasks/:id
tasks.get("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  // Check cache first
  const cacheKey = `tasks:${userId}:${id}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return c.json({ success: true, task: cached });
  }

  const task = await prisma.user_tasks.findFirst({
    where: {
      id,
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

  // Cache the result for 5 minutes
  await setCached(cacheKey, task, 300);

  return c.json({
    success: true,
    task,
  });
});

// PATCH /tasks/:id/toggle
tasks.patch("/:id/toggle", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const task = await prisma.user_tasks.findFirst({
    where: {
      id,
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

  const completed = task.status === "COMPLETED";

  const updated = await prisma.user_tasks.update({
    where: { id },
    data: {
      status: completed ? "PENDING" : "COMPLETED",
      completedAt: completed ? null : new Date(),
    },
  });

  // Invalidate cache
  await deleteCached(`tasks:${userId}:${id}`);
  await deleteCachedPattern(`tasks:${userId}*`);

  return c.json({
    success: true,
    task: updated,
  });
});

export default tasks;
