// apps/api/src/routes/resume.ts
import { Hono } from "hono";
import { uploadFileToR2 } from "@applyai/utils";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "@applyai/db";

const resume = new Hono();

// POST /api/resume/upload
resume.post("/upload", authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["resume"] as File;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (file.type !== "application/pdf") {
      return c.json({ error: "Only PDF files are allowed" }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File must be under 5 MB" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const userId = c.get("userId");
    const fileName = `resumes/${userId}/${timestamp}_${safeName}`;
    const url = await uploadFileToR2(buffer, fileName, file.type);
      await prisma.users.update({
        where: { id: userId },
        data: { resumeUrl: url },
      });

    return c.json({ url, fileName });
  } catch (err) {
    console.error("Resume upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

resume.post("/update", authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["resume"] as File;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (file.type !== "application/pdf") {
      return c.json({ error: "Only PDF files are allowed" }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File must be under 5 MB" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const userId = c.get("userId");
    const fileName = `resumes/${userId}/${timestamp}_${safeName}`;
    const url = await uploadFileToR2(buffer, fileName, file.type);
    await prisma.users.update({
      where: { id: userId },
      data: { resumeUrl: url },
    });

    return c.json({ url, fileName });
  } catch (err) {
    console.error("Resume update error:", err);
    return c.json({ error: "Update failed" }, 500);
  }
});

// GET /api/resume
resume.get("/", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { resumeUrl: true },
    });

    if (!user || !user.resumeUrl) {
      return c.json({ error: "No resume found" }, 404);
    }

    return c.json({ url: user.resumeUrl });
  } catch (err) {
    console.error("Resume fetch error:", err);
    return c.json({ error: "Failed to fetch resume" }, 500);
  }
});

export default resume;
