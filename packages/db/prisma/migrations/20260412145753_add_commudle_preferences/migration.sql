-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "commudlePreferences" JSONB,
ALTER COLUMN "unstopPreferences" DROP NOT NULL,
ALTER COLUMN "unstopPreferences" DROP DEFAULT;
