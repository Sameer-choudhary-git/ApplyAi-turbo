import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { ZodError } from "zod";
import {
  createInterviewSchema,
  updateInterviewSchema,
} from "../schemas/interview";
import { getCached, setCached, deleteCached, deleteCachedPattern } from "../lib/cache.js";

const interviews = new Hono();

/**
 * GET /api/interviews
 * Get all interviews for logged in user
 */
interviews.get("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    // Check cache first
    const cacheKey = `interviews:${userId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, interviews: cached });
    }

    const data = await prisma.user_interviews.findMany({
      where: {
        userId,
      },
      include: {
        application: {
          select: {
            id: true,
            company: true,
            jobTitle: true,
            platform: true,
          },
        },
      },
      orderBy: [
        {
          interviewAt: "asc",
        },
      ],
    });

    // Cache the result for 5 minutes
    await setCached(cacheKey, data, 300);

    return c.json({
      success: true,
      interviews: data,
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to fetch interviews",
      },
      500,
    );
  }
});

/**
 * GET /api/interviews/:id
 */
interviews.get("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    // Check cache first
    const cacheKey = `interviews:${userId}:${id}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return c.json({ success: true, interview: cached });
    }

    const interview = await prisma.user_interviews.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        application: true,
        reminders: true,
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

    // Cache the result for 5 minutes
    await setCached(cacheKey, interview, 300);

    return c.json({
      success: true,
      interview,
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to fetch interview",
      },
      500,
    );
  }
});

/**
 * POST /api/interviews
 * Create interview
 */
interviews.post("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    const body = createInterviewSchema.parse(await c.req.json());

    /**
     * Verify application ownership if applicationId is provided
     */
    if (body.applicationId) {
      const application = await prisma.user_job_applications.findFirst({
        where: {
          id: body.applicationId,
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
    }

    const interview = await prisma.user_interviews.create({
      data: {
        userId,

        applicationId: body.applicationId,

        title: body.title,

        company: body.company,

        round: body.round,

        interviewAt: body.interviewAt,

        duration: body.duration,

        meetingUrl: body.meetingUrl,

        timezone: body.timezone,

        notes: body.notes,

        status: "SCHEDULED",
      },
      include: {
        application: {
          select: {
            id: true,
            company: true,
            jobTitle: true,
          },
        },
      },
    });

    /**
     * Mark application as interview scheduled
     */
    if (body.applicationId) {
      await prisma.user_job_applications.update({
        where: {
          id: body.applicationId,
        },
        data: {
          interviewScheduled: true,
        },
      });
    }
    await prisma.user_job_applications.update({
      where: {
        id: body.applicationId,
      },
      data: {
        interviewScheduled: true,
        status: "Interview Scheduled", // or whatever status convention you use
        responseReceivedAt:new Date()
      },
    });

    // Invalidate cache
    await deleteCachedPattern(`interviews:${userId}*`);
    await deleteCachedPattern(`applications:${userId}*`);

    return c.json(
      {
        success: true,
        interview,
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
        error: "Failed to create interview",
      },
      500,
    );
  }
});

/**
 * PATCH /api/interviews/:id
 * Update interview
 */
interviews.patch("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const body = updateInterviewSchema.parse(await c.req.json());

    const existing = await prisma.user_interviews.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Interview not found",
        },
        404,
      );
    }

    /**
     * Verify new application ownership (if changed)
     */
    if (body.applicationId) {
      const application = await prisma.user_job_applications.findFirst({
        where: {
          id: body.applicationId,
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
    }

    const interview = await prisma.user_interviews.update({
      where: {
        id,
      },
      data: {
        ...body,
      },
      include: {
        application: {
          select: {
            id: true,
            company: true,
            jobTitle: true,
            platform: true,
          },
        },
        reminders: true,
      },
    });

    // Invalidate cache
    await deleteCached(`interviews:${userId}:${id}`);
    await deleteCachedPattern(`interviews:${userId}*`);
    await deleteCachedPattern(`applications:${userId}*`);

    return c.json({
      success: true,
      interview,
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
        error: "Failed to update interview",
      },
      500,
    );
  }
});

/**
 * DELETE /api/interviews/:id
 */
interviews.delete("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const interview = await prisma.user_interviews.findFirst({
      where: {
        id,
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

    await prisma.user_interviews.delete({
      where: {
        id,
      },
    });

    /**
     * If this interview belonged to an application,
     * check whether any interviews still exist.
     */
    if (interview.applicationId) {
      const count = await prisma.user_interviews.count({
        where: {
          applicationId: interview.applicationId,
        },
      });

      if (count === 0) {
        await prisma.user_job_applications.update({
          where: {
            id: interview.applicationId,
          },
          data: {
            interviewScheduled: false,
          },
        });
      }
    }

    // Invalidate cache
    await deleteCached(`interviews:${userId}:${id}`);
    await deleteCachedPattern(`interviews:${userId}*`);
    await deleteCachedPattern(`applications:${userId}*`);

    return c.json({
      success: true,
      message: "Interview deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return c.json(
      {
        success: false,
        error: "Failed to delete interview",
      },
      500,
    );
  }
});

export default interviews;
