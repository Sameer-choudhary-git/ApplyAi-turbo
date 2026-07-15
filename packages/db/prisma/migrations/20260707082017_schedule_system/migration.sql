/*
  Warnings:

  - You are about to drop the column `completed` on the `user_tasks` table. All the data in the column will be lost.
  - The `priority` column on the `user_tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `category` column on the `user_tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('GENERAL', 'INTERVIEW', 'OA', 'DEADLINE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'APPLICATION', 'AGENT');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('EMAIL', 'GOOGLE_CALENDAR', 'PUSH');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- AlterTable
ALTER TABLE "user_job_applications" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "interviewScheduled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_tasks" DROP COLUMN "completed",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "priority",
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
DROP COLUMN "category",
ADD COLUMN     "category" "TaskCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "user_interviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "round" TEXT,
    "interviewAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "meetingUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "notes" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reminders" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "interviewId" TEXT,
    "reminderAt" TIMESTAMP(3) NOT NULL,
    "type" "ReminderType" NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_google_calendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_google_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_interviews_userId_idx" ON "user_interviews"("userId");

-- CreateIndex
CREATE INDEX "user_interviews_interviewAt_idx" ON "user_interviews"("interviewAt");

-- CreateIndex
CREATE INDEX "task_reminders_reminderAt_idx" ON "task_reminders"("reminderAt");

-- CreateIndex
CREATE INDEX "task_reminders_sent_idx" ON "task_reminders"("sent");

-- CreateIndex
CREATE UNIQUE INDEX "user_google_calendar_userId_key" ON "user_google_calendar"("userId");

-- CreateIndex
CREATE INDEX "user_tasks_dueDate_idx" ON "user_tasks"("dueDate");

-- AddForeignKey
ALTER TABLE "user_interviews" ADD CONSTRAINT "user_interviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interviews" ADD CONSTRAINT "user_interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "user_job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "user_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "user_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_google_calendar" ADD CONSTRAINT "user_google_calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
