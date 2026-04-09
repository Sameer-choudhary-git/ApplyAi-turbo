import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { prisma } from "@applyai/db";
import { applyQueue } from "@applyai/queue";

const app = new Hono();

app.get("/", (c) => c.text("API running"));

// create user
app.post("/user", async (c) => {
  const body = await c.req.json();
  const user = await prisma.users.create({ data: body });
  return c.json(user);
});

// get jobs
app.get("/jobs", async (c) => {
  const jobs = await prisma.unstop_internships.findMany({
    where: { isActive: true },
    take: 50,
  });
  return c.json(jobs);
});

// trigger apply
app.post("/apply", async (c) => {
  const { userId } = await c.req.json();
  await applyQueue.add("apply", { userId });
  return c.json({ success: true });
});

serve({ fetch: app.fetch, port: 3000 });