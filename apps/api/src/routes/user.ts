import { Hono } from 'hono';
import { prisma } from '@applyai/db';
import { authMiddleware } from '../middleware/auth';

const user = new Hono();

// POST /api/users/onboard
// Creates user + all nested relations in one transaction
user.post('/onboard', authMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      fullName:    string;
      email:       string;
      phone?:      string;
      location?:   string;
      bio?:        string;
      resumeUrl?:  string;
      linkedinUrl?: string;
      githubUrl?:  string;
      education: {
        institution:  string;
        degree?:      string;
        fieldOfStudy?: string;
        gpa?:         string;
        startYear?:   number;
        endYear?:     number;
      }[];
      experience: {
        company:      string;
        role?:        string;
        duration?:    string;
        description?: string;
      }[];
      skills: string[];
      preferences: {
        workModes:        string[];
        opportunityTypes: string[];
        platforms:        string[];
      };
    };

    const authUser = c.get("supabaseUser");
    const userId = c.get("userId");

    if (!body.fullName) {
      return c.json({ error: 'fullName is required' }, 400);
    }

    const createdUser = await prisma.$transaction(async (tx) => {
      const u = await tx.users.upsert({
        where: { id: userId },
        create: {
          id:          userId,
          fullName:    body.fullName,
          email:       authUser.email!,
          phone:       body.phone,
          location:    body.location,
          bio:         body.bio,
          resumeUrl:   body.resumeUrl,
          linkedinUrl: body.linkedinUrl,
          githubUrl:   body.githubUrl,
          isOnboarded: true,
          onboardedAt: new Date(),
        },
        update: {
          fullName:    body.fullName,
          phone:       body.phone,
          location:    body.location,
          bio:         body.bio,
          resumeUrl:   body.resumeUrl     ?? undefined,
          linkedinUrl: body.linkedinUrl   ?? undefined,
          githubUrl:   body.githubUrl     ?? undefined,
          isOnboarded: true,
          onboardedAt: new Date(),
        },
      });

      // 2. Delete old relations then recreate (clean upsert for arrays)
      await tx.user_education.deleteMany({ where: { userId: u.id } });
      if (body.education?.length) {
        await tx.user_education.createMany({
          data: body.education.map(e => ({
            userId:       u.id,
            institution:  e.institution,
            degree:       e.degree,
            fieldOfStudy: e.fieldOfStudy,
            gpa:          e.gpa,
            startYear:    e.startYear,
            endYear:      e.endYear,
          })),
        });
      }

      await tx.user_experience.deleteMany({ where: { userId: u.id } });
      if (body.experience?.length) {
        await tx.user_experience.createMany({
          data: body.experience.map(e => ({
            userId:      u.id,
            company:     e.company,
            role:        e.role,
            duration:    e.duration,
            description: e.description,
          })),
        });
      }

      await tx.user_skills.deleteMany({ where: { userId: u.id } });
      if (body.skills?.length) {
        await tx.user_skills.createMany({
          data: body.skills.map(skill => ({ userId: u.id, skill })),
          skipDuplicates: true,
        });
      }

      await tx.user_preferences.upsert({
        where:  { userId: u.id },
        create: {
          userId:          u.id,
          workModes:       body.preferences.workModes,
          opportunityTypes: body.preferences.opportunityTypes,
          platforms:       body.preferences.platforms,
        },
        update: {
          workModes:        body.preferences.workModes,
          opportunityTypes: body.preferences.opportunityTypes,
          platforms:        body.preferences.platforms,
        },
      });

      return u;
    });

    return c.json({ success: true, userId: createdUser.id });
  } catch (err) {
    console.error('Onboarding error:', err);
    return c.json({ error: 'Failed to save onboarding data' }, 500);
  }
});

user.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        education: true,
        experience: true,
        skills: true,
        platformSessions: {
          where: { isActive: true },
          select: {
            platform: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // ─────────────────────────────────────────────────────────────
    // Flags (from users table)
    // ─────────────────────────────────────────────────────────────

    const flags = {
      isUnstopInternshipEnabled: user.isUnstopInternshipEnabled,
      isUnstopJobEnabled: user.isUnstopJobEnabled,
      isCommudleEventEnabled: user.isCommudleEventEnabled,
    };

    // ─────────────────────────────────────────────────────────────
    // Sessions → { unstop: true }
    // ─────────────────────────────────────────────────────────────

    const sessions = user.platformSessions.reduce<Record<string, boolean>>(
      (acc, s) => {
        acc[s.platform] = true;
        return acc;
      },
      {}
    );

    // ─────────────────────────────────────────────────────────────
    // Preferences (safe defaults)
    // ─────────────────────────────────────────────────────────────

    const preferences = user.preferences ?? {
      workModes: [],
      opportunityTypes: [],
      platforms: [],
      preferredLocations: [],
      minStipend: 0,
      rolesOfInterest: [],
      industries: [],
      autoApply: false,
      dailyApplyLimit: 10,
      unstopPreferences: {},
      commudlePreferences: {},
    };

    // ─────────────────────────────────────────────────────────────
    // Final response
    // ─────────────────────────────────────────────────────────────

    return c.json({
      success: true,

      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        resumeUrl: user.resumeUrl,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        isOnboarded: user.isOnboarded,
      },

      preferences,
      flags,
      sessions,

      profile: {
        education: user.education,
        experience: user.experience,
        skills: user.skills.map((s) => s.skill),
      },
    });
  } catch (err) {
    console.error("GET /me error:", err);
    return c.json(
      { success: false, error: "Failed to fetch user data" },
      500
    );
  }
});
export default user;