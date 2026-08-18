CREATE TABLE "user_saved_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "url" TEXT,
    "location" TEXT,
    "workMode" TEXT,
    "stipend" TEXT,
    "type" TEXT NOT NULL DEFAULT 'job',
    "sourceSite" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_saved_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_saved_jobs_userId_idx" ON "user_saved_jobs"("userId");
CREATE INDEX "user_saved_jobs_userId_status_idx" ON "user_saved_jobs"("userId", "status");
CREATE UNIQUE INDEX "user_saved_jobs_userId_url_key" ON "user_saved_jobs"("userId", "url");

ALTER TABLE "user_saved_jobs"
ADD CONSTRAINT "user_saved_jobs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
