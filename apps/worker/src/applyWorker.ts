import { Worker } from "bullmq";
import { connection } from "@applyai/queue";
import { prisma } from "@applyai/db";

const worker = new Worker(
  "apply-job",
  async (job) => {
    const { userId } = job.data;

    console.log("🚀 Processing user:", userId);

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) throw new Error("User not found");

    const session = await prisma.user_platform_sessions.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: "unstop"
        }
      }
    });

    if (!session) throw new Error("No session found");

    const cookie = JSON.parse(decrypt(session.encryptedCookie));

    const jobs = await prisma.unstop_internships.findMany({
      where: { isActive: true },
    });

    for (const jobItem of jobs) {
      console.log(`Applying to: ${jobItem.title}`);

      await applyToUnstop(jobItem, cookie);
    }

    console.log("✅ Done user:", userId);
  },
  {
    connection,
    concurrency: 5 // 🔥 important
  }
);