import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),

  description: z.string().trim().max(1000).optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

  category: z.enum([
    "GENERAL",
    "INTERVIEW",
    "OA",
    "DEADLINE",
    "FOLLOW_UP",
  ]).optional(),

  dueDate: z.coerce.date().optional(),

  source: z.enum(["MANUAL", "APPLICATION", "AGENT"]).optional(),

  sourceId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum([
    "PENDING",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
});