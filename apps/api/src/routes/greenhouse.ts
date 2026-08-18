import { Hono } from "hono";
import { GreenhouseAutofillJob } from "@applyai/jobs";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import {
  confirmManualGreenhouseApplication,
  getGreenhouseAutomationSettings,
  getGreenhouseDiscoveryStatus,
  getUserLimitSnapshot,
  updateGreenhouseAutomationSettings,
  listGreenhouseJobs,
  prepareManualGreenhouseApplication,
} from "@applyai/greenhouse";

export const greenhouseRouter = new Hono();
greenhouseRouter.use("*", authMiddleware);

greenhouseRouter.get("/jobs", async (c) => {
  try {
    const query = c.req.query();
    const result = await listGreenhouseJobs({
      search: query.search,
      location: query.location,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error("GET /api/greenhouse/jobs error:", error);
    return c.json(
      { success: false, error: "Failed to load Greenhouse jobs" },
      500,
    );
  }
});

greenhouseRouter.get("/status", async (c) => {
  try {
    return c.json({
      success: true,
      data: await getGreenhouseDiscoveryStatus(),
    });
  } catch (error) {
    console.error("GET /api/greenhouse/status error:", error);
    return c.json(
      { success: false, error: "Failed to load Greenhouse discovery status" },
      500,
    );
  }
});

greenhouseRouter.get("/settings", async (c) => {
  try {
    return c.json({
      success: true,
      data: await getGreenhouseAutomationSettings(c.get("userId") as string),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Greenhouse settings";
    return c.json({ success: false, error: message }, 500);
  }
});

greenhouseRouter.patch("/settings", async (c) => {
  try {
    const body = await c.req.json();
    const autoSubmit = body?.autoSubmit === true;
    const data = await updateGreenhouseAutomationSettings(
      c.get("userId") as string,
      { autoSubmit },
    );
    return c.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Greenhouse settings";
    return c.json({ success: false, error: message }, 400);
  }
});

greenhouseRouter.get("/limits", async (c) => {
  try {
    const userId = c.get("userId") as string;
    return c.json({
      success: true,
      data: await getUserLimitSnapshot(userId, "greenhouse"),
    });
  } catch (error) {
    console.error("GET /api/greenhouse/limits error:", error);
    return c.json(
      { success: false, error: "Failed to load Greenhouse limits" },
      500,
    );
  }
});

greenhouseRouter.post("/jobs/:jobId/prepare", async (c) => {
  try {
    const userId = c.get("userId") as string;
    const application = await prepareManualGreenhouseApplication(
      userId,
      c.req.param("jobId"),
    );
    return c.json({ success: true, data: application }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare application";
    return c.json(
      { success: false, error: message },
      message.includes("limit") ? 409 : 400,
    );
  }
});

greenhouseRouter.get("/applications/:applicationId", async (c) => {
  try {
    const application = await prisma.user_job_applications.findFirst({
      where: {
        id: c.req.param("applicationId"),
        userId: c.get("userId") as string,
        platform: "greenhouse",
      },
    });
    if (!application)
      return c.json({ success: false, error: "Application not found" }, 404);
    return c.json({ success: true, data: application });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load application";
    return c.json({ success: false, error: message }, 500);
  }
});

greenhouseRouter.post("/applications/:applicationId/autofill", async (c) => {
  try {
    const userId = c.get("userId") as string;
    const applicationId = c.req.param("applicationId");
    const body = await c.req.json().catch(() => ({}));
    const submit = body?.submit === true;
    if (submit && process.env.GREENHOUSE_AUTO_SUBMIT !== "true") {
      return c.json(
        {
          success: false,
          error: "Automatic Greenhouse submission is disabled",
        },
        409,
      );
    }
    const job = await new GreenhouseAutofillJob({
      userId,
      applicationId,
      submit,
    }).enqueue({
      jobId: `greenhouse-autofill-${applicationId}-${submit ? "submit" : "fill"}`,
    });
    return c.json({ success: true, queued: true, jobId: job.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue autofill";
    return c.json({ success: false, error: message }, 400);
  }
});

greenhouseRouter.post("/applications/:applicationId/confirm", async (c) => {
  try {
    const userId = c.get("userId") as string;
    const application = await confirmManualGreenhouseApplication(
      userId,
      c.req.param("applicationId"),
    );
    const autofillJob = await new GreenhouseAutofillJob({
      userId,
      applicationId: application.id,
      submit:
        process.env.GREENHOUSE_AUTO_SUBMIT === "true" &&
        (await getGreenhouseAutomationSettings(userId)).autoSubmit,
    }).enqueue({
      jobId: `greenhouse-autofill-${application.id}-fill`,
    });
    return c.json({
      success: true,
      data: application,
      queued: true,
      jobId: autofillJob.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm application";
    return c.json({ success: false, error: message }, 400);
  }
});
