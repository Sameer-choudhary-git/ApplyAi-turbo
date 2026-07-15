import { z } from "zod";

export const createReminderSchema = z.object({
  taskId: z.string().optional(),

  interviewId: z.string().optional(),

  reminderAt: z.coerce.date(),

  type: z.enum([
    "EMAIL",
    "GOOGLE_CALENDAR",
    "PUSH",
  ]),
}).refine(
  (data) => data.taskId || data.interviewId,
  {
    message: "Either taskId or interviewId is required",
    path: ["taskId"],
  },
);

export const updateReminderSchema = z.object({
  taskId: z.string().optional(),
  interviewId: z.string().optional(),
  reminderAt: z.coerce.date().optional(),
  type: z.enum(["EMAIL", "GOOGLE_CALENDAR", "PUSH"]).optional(),
  sent: z.boolean().optional(),
  externalId: z.string().optional(),
}).refine(
  (data) => data.taskId || data.interviewId,
  {
    message: "Either taskId or interviewId is required",
    path: ["taskId"],
  },
);