-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'DONE', 'DISMISSED');

-- AlterTable
ALTER TABLE "user_interviews" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "syncedToGoogleAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_tasks" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "syncedToGoogleAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "googleEventId" TEXT,
    "syncedToGoogleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_reminders_userId_idx" ON "user_reminders"("userId");

-- CreateIndex
CREATE INDEX "user_reminders_remindAt_idx" ON "user_reminders"("remindAt");

-- CreateIndex
CREATE INDEX "user_reminders_sourceType_sourceId_idx" ON "user_reminders"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "user_reminders" ADD CONSTRAINT "user_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
