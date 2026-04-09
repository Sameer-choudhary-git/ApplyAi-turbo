-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isCommudleEventEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnstopInternshipEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastQueueReset" TIMESTAMP(3),
ADD COLUMN     "lastQueuedAt" TIMESTAMP(3),
ADD COLUMN     "queueCountToday" INTEGER NOT NULL DEFAULT 0;
