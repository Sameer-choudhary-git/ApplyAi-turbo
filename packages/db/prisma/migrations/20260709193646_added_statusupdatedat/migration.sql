/*
  Warnings:

  - Added the required column `statusUpdatedAt` to the `user_job_applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_job_applications" ADD COLUMN     "responseReceivedAt" TIMESTAMP(3),
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3) NOT NULL;
