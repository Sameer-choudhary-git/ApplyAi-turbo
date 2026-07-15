import { z } from "zod";

export const createInterviewSchema = z.object({
  applicationId: z.string().optional(),

  title: z.string().trim().min(1).max(200),

  company: z.string().trim().min(1).max(200),

  round: z.string().trim().max(100).optional(),

  interviewAt: z.coerce.date(),

  duration: z.number().int().positive().optional(),

  meetingUrl: z.string().url().optional(),

  timezone: z.string().default("Asia/Kolkata"),

  notes: z.string().max(2000).optional(),
});

export const updateInterviewSchema =
  createInterviewSchema.partial().extend({
    status: z.enum([
      "SCHEDULED",
      "COMPLETED",
      "CANCELLED",
      "RESCHEDULED",
    ]).optional(),
  });