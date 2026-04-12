import { Hono } from "hono";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth";

export const preferencesRouter = new Hono();

preferencesRouter.put("/", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid payload" }, 400);
  console.log("BODY RECEIVED:", body);

  const updatedPreferences = await prisma.user_preferences.upsert({
    where: { userId },

    update: {
      workModes: body.workModes !== undefined ? body.workModes : undefined,
      opportunityTypes:
        body.opportunityTypes !== undefined ? body.opportunityTypes : undefined,
      platforms: body.platforms !== undefined ? body.platforms : undefined,
      preferredLocations:
        body.preferredLocations !== undefined
          ? body.preferredLocations
          : undefined,
      minStipend: body.minStipend !== undefined ? body.minStipend : undefined,
      rolesOfInterest:
        body.rolesOfInterest !== undefined ? body.rolesOfInterest : undefined,
      industries: body.industries !== undefined ? body.industries : undefined,
      autoApply: body.autoApply !== undefined ? body.autoApply : undefined,
      dailyApplyLimit:
        body.dailyApplyLimit !== undefined ? body.dailyApplyLimit : undefined,

      ...Object.fromEntries(
        Object.entries(body).filter(([k]) => k.endsWith("Preferences")),
      ),
    },

    create: {
      userId,
      workModes: body.workModes ?? [],
      opportunityTypes: body.opportunityTypes ?? [],
      platforms: body.platforms ?? [],
      preferredLocations: body.preferredLocations ?? [],
      minStipend: body.minStipend ?? 0,
      rolesOfInterest: body.rolesOfInterest ?? [],
      industries: body.industries ?? [],
      autoApply: body.autoApply ?? false,
      dailyApplyLimit: body.dailyApplyLimit ?? 10,

      ...Object.fromEntries(
        Object.entries(body).filter(([k]) => k.endsWith("Preferences")),
      ),
    },
  });

  return c.json({ success: true, data: updatedPreferences });
});
