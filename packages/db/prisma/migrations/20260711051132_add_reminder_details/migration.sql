-- AlterTable
ALTER TABLE "user_reminders" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "location" TEXT;
