import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";
import { enableJobsConfig } from "@applyai/config";
interface Jobs {
  isUnstopInternshipEnabled?: boolean;
  isCommudleEventEnabled?: boolean;
}
export const userFlagsRouter = new Hono();

const allowedFlags = Object.values(enableJobsConfig).flatMap((platform) =>
  Object.values(platform.jobs).map((j) => j.flag)
);

userFlagsRouter.patch("/", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  // 🔒 filter only allowed flags
  const safeData: Record<string, boolean> = {};
  
  for (const key of Object.keys(body)) {
    if (allowedFlags.includes(key) && typeof body[key] === "boolean") {
      safeData[key] = body[key];
    }
  }

  if (Object.keys(safeData).length === 0) {
    return c.json({ error: "No valid flags provided" }, 400);
  }

  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: safeData,
    select: {
      id: true,
      ...Object.fromEntries(allowedFlags.map((f) => [f, true])),
    },
  });

  return c.json({ success: true, data: updatedUser });
});