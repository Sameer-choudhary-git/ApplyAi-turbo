// apps/api/src/routes/user.ts  (add this route or merge into existing)
import { Hono } from 'hono';
import { prisma } from '@applyai/db'; // adjust import to your db package export

const user = new Hono();

// POST /api/users/onboard
// Creates user + all nested relations in one transaction
user.post('/onboard', async (c) => {
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

    if (!body.fullName || !body.email) {
      return c.json({ error: 'fullName and email are required' }, 400);
    }

    // Upsert so re-submitting onboarding doesn't explode
    const createdUser = await prisma.$transaction(async (tx) => {
      // 1. Upsert the user row
      const u = await tx.users.upsert({
        where: { email: body.email },
        create: {
          fullName:    body.fullName,
          email:       body.email,
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

export default user;