-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "autoApply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyApplyLimit" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "industries" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "minStipend" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preferredLocations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "rolesOfInterest" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "unstopPreferences" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isUnstopJobEnabled" BOOLEAN NOT NULL DEFAULT false;
