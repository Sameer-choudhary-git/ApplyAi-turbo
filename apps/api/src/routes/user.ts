import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@applyai/db";
import { authMiddleware } from "../middleware/auth.js";

export const userRoutes = new Hono();

// All user routes require auth
userRoutes.use("*", authMiddleware);

// ── Get full profile ───────────────────────────────────────
userRoutes.get("/profile", async (c) => {
  const userId = c.get("userId") as string;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      education: true,
      experience: true,
      skills: true,
      preferences: true,
      platformSessions: {
        select: {
          platform: true,
          isActive: true,
          lastVerifiedAt: true,
          expiresAt: true,
          // Never return encryptedCookie to frontend
        },
      },
    },
  });

  if (!user) return c.json({ success: false, error: "User not found" }, 404);

  return c.json({ success: true, user });
});

// ── Update basic profile ───────────────────────────────────
const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
});

userRoutes.patch(
  "/profile",
  zValidator("json", updateProfileSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const data = c.req.valid("json");

    const user = await prisma.users.update({
      where: { id: userId },
      data,
    });

    return c.json({ success: true, user });
  }
);

// ── Onboarding ─────────────────────────────────────────────
const onboardingSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().optional(),
        fieldOfStudy: z.string().optional(),
        gpa: z.string().optional(),
        startYear: z.number().optional(),
        endYear: z.number().optional(),
      })
    )
    .optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string().optional(),
        duration: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
  skills: z.array(z.string()).optional(),
  preferences: z
    .object({
      workModes: z.array(z.string()).optional(),
      opportunityTypes: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
    })
    .optional(),
});

userRoutes.post(
  "/onboarding",
  zValidator("json", onboardingSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const data = c.req.valid("json");

    // Run everything in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update base profile
      await tx.users.update({
        where: { id: userId },
        data: {
          fullName: data.fullName,
          phone: data.phone,
          location: data.location,
          bio: data.bio,
          isOnboarded: true,
          onboardedAt: new Date(),
        },
      });

      // Replace education
      if (data.education?.length) {
        await tx.user_education.deleteMany({ where: { userId } });
        await tx.user_education.createMany({
          data: data.education.map((e) => ({ ...e, userId })),
        });
      }

      // Replace experience
      if (data.experience?.length) {
        await tx.user_experience.deleteMany({ where: { userId } });
        await tx.user_experience.createMany({
          data: data.experience.map((e) => ({ ...e, userId })),
        });
      }

      // Replace skills
      if (data.skills?.length) {
        await tx.user_skills.deleteMany({ where: { userId } });
        await tx.user_skills.createMany({
          data: data.skills.map((skill) => ({ userId, skill })),
          skipDuplicates: true,
        });
      }

      // Upsert preferences
      if (data.preferences) {
        await tx.user_preferences.upsert({
          where: { userId },
          update: data.preferences,
          create: { userId, ...data.preferences },
        });
      }

      return tx.users.findUnique({
        where: { id: userId },
        include: {
          education: true,
          experience: true,
          skills: true,
          preferences: true,
        },
      });
    });

    return c.json({ success: true, user });
  }
);

// ── Toggle platform auto-apply ─────────────────────────────
const togglePlatformSchema = z.object({
  platform: z.enum(["unstop", "commudle"]),
  enabled: z.boolean(),
});

userRoutes.patch(
  "/platforms/toggle",
  zValidator("json", togglePlatformSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { platform, enabled } = c.req.valid("json");

    const updateData =
      platform === "unstop"
        ? { isUnstopInternshipEnabled: enabled }
        : { isCommudleEventEnabled: enabled };

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        isUnstopInternshipEnabled: true,
        isCommudleEventEnabled: true,
      },
    });

    return c.json({ success: true, ...user });
  }
);

// ── Save platform session (cookie) ────────────────────────
// NOTE: encrypt the cookie before storing — never store raw cookies
const platformSessionSchema = z.object({
  platform: z.string(),
  encryptedCookie: z.string(),
  expiresAt: z.string().datetime().optional(),
});

userRoutes.post(
  "/platforms/session",
  zValidator("json", platformSessionSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const data = c.req.valid("json");

    const session = await prisma.user_platform_sessions.upsert({
      where: { userId_platform: { userId, platform: data.platform } },
      update: {
        encryptedCookie: data.encryptedCookie,
        isActive: true,
        lastVerifiedAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      create: {
        userId,
        platform: data.platform,
        encryptedCookie: data.encryptedCookie,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    return c.json({
      success: true,
      session: {
        platform: session.platform,
        isActive: session.isActive,
        lastVerifiedAt: session.lastVerifiedAt,
      },
    });
  }
);