/*
  Warnings:

  - Made the column `unstopPreferences` on table `user_preferences` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "dailyApplyLimit" SET DEFAULT 10,
ALTER COLUMN "unstopPreferences" SET NOT NULL,
ALTER COLUMN "unstopPreferences" SET DEFAULT '{}';
