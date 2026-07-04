import { prisma } from "@applyai/db";
import { ApplyUnstopInternshipPayload } from "@applyai/apply";
import { decrypt } from "@applyai/utils";
import { agentRegistry } from "@applyai/apply";
export class ApplyUnstopInternshipService {
  async apply(payload: ApplyUnstopInternshipPayload) {
    const { userId } = payload;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        skills: true,
        platformSessions: {
          where: {
            isActive: true,
          },
        },
      },
    });

    //TODO : Handle user apply limit and cooldown logic here or in the EligibilityService

    if (!user) {
      console.log(`User ${payload.userId} not found.`);
      return;
    }
    if (user.isUnstopInternshipEnabled === false) {
      console.log(`
      User ${payload.userId} has disabled Unstop internship auto-apply.`);
      return;
    }
    const encryptedCookie = user.platformSessions.find(
      (session) => session.platform === "unstop",
    )?.encryptedCookie;

    if (!encryptedCookie) {
      console.log(`No Unstop cookie found for user ${user.id}.`);
      return;
    }

    const decryptedCookie = decrypt(encryptedCookie);

    const agent = agentRegistry["unstop"];

    if (!agent) {
      console.log(`No agent for unstop`);
      return;
    }

    const result = await agent({
      userId: user.id,
      cookie: decryptedCookie,
      preferences: user.preferences,
      skills: user.skills,
    });

    if (!result?.applications?.length) {
      return;
    }

    await prisma.user_job_applications.createMany({
      data: result.applications.map((application: any) => ({
        userId: user.id,

        platform: "unstop",

        jobTitle: application.title,
        company: application.company,
        jobLink: application.link,
        type: application.type,

        status: application.status,
        notes: application.notes,
      })),
    });
  }
}
