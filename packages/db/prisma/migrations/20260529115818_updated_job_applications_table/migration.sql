-- AlterTable
ALTER TABLE "user_job_applications" ADD COLUMN     "location" TEXT,
ADD COLUMN     "success_probability" INTEGER,
ADD COLUMN     "type" TEXT;
