import { Worker } from "bullmq";

import { connection } from "@applyai/queue";
import { decrypt } from "@applyai/utils";
import { prisma } from "@applyai/db";

import { agentRegistry } from "./agents";

type JobData = {
  userId: string;
  platforms: string[];
  preferences: any;
  skills: string[];

  cookies: {
    platform: string;
    cookie: string;
  }[];
};

export const worker = new Worker(
  "apply",

  async (job) => {
    const data = job.data as JobData;

    console.log("Processing user:", data.userId);

    try {
      for (const currentCookie of data.cookies) {
        try {
          const platform = currentCookie.platform;

          const agent = agentRegistry[platform];

          if (!agent) {
            console.log(`No agent for ${platform}`);
            continue;
          }

          const decryptedCookie = decrypt(currentCookie.cookie);

          const result = await agent({
            userId: data.userId,
            cookie: decryptedCookie,
            preferences: data.preferences,
            skills: data.skills,
          });

          for (const app of result.applications) {
            await prisma.user_job_applications.create({
              data: {
                userId: data.userId,

                platform,

                jobTitle: app.title,
                company: app.company,
                jobLink: app.link,
                type: app.type,

                status: app.status,
                notes: app.notes,
              },
            });
          }
        } catch (err) {
          console.error(`Error processing platform:`, err);
          throw err;
        }
      }

      return { success: true };
    } catch (err) {
      console.error(`Job failed for user ${data.userId}:`, err);
      throw err;
    }
  },

  {
    connection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`Completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Failed: ${job?.id}`, err);
});
