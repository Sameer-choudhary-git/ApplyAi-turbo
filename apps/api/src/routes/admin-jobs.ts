import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import {
  ExtractUnstopInternshipsJob,
  ExtractCommudleJob,
  UnstopValidationJob,
  QueueEligibleUsersJob,
} from "@applyai/jobs";

export const adminJobsRouter = new Hono();

// Simple allowlist so only you (or specific admin user IDs) can trigger jobs.
// Set ADMIN_USER_IDS in your .env as a comma-separated list of user ids.
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function requireAdmin(userId: string | undefined) {
  return !!userId && ADMIN_USER_IDS.includes(userId);
}

const JOB_REGISTRY: Record<string, () => Promise<any>> = {
  "unstop-internships": () => new ExtractUnstopInternshipsJob().enqueue(),
  // "commudle-events": () => new ExtractCommudleJob().enqueue(),
  "unstop-validation": () => new UnstopValidationJob().enqueue(),
  "apply-queue-eligible-user": () => new QueueEligibleUsersJob().enqueue() 
};

// GET /api/admin/jobs — list available jobs (for the frontend to render buttons)
adminJobsRouter.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!requireAdmin(userId)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  return c.json({
    success: true,
    jobs: Object.keys(JOB_REGISTRY).map((key) => ({ key })),
  });
});

// POST /api/admin/jobs/:key/trigger — enqueue a single job by key
adminJobsRouter.post("/:key/trigger", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!requireAdmin(userId)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const key = c.req.param("key");
  const runner = JOB_REGISTRY[key as string];

  if (!runner) {
    return c.json({ success: false, error: `Unknown job: ${key}` }, 404);
  }

  try {
    await runner();
    console.log(`[admin] Job "${key}" manually triggered by ${userId}`);
    return c.json({ success: true, message: `${key} enqueued` });
  } catch (err) {
    console.error(`[admin] Failed to trigger job "${key}":`, err);
    return c.json({ success: false, error: "Failed to enqueue job" }, 500);
  }
});

// POST /api/admin/jobs/trigger-all — enqueue every job at once (mirrors the daily scheduler)
adminJobsRouter.post("/trigger-all", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!requireAdmin(userId)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  try {
    await Promise.all(Object.values(JOB_REGISTRY).map((runner) => runner()));
    console.log(`[admin] All jobs manually triggered by ${userId}`);
    return c.json({ success: true, message: "All jobs enqueued" });
  } catch (err) {
    console.error("[admin] Failed to trigger all jobs:", err);
    return c.json({ success: false, error: "Failed to enqueue jobs" }, 500);
  }
});

export default adminJobsRouter; 