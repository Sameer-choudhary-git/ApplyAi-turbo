-- CreateTable
CREATE TABLE "user_job_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobLink" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_job_applications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_job_applications" ADD CONSTRAINT "user_job_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
