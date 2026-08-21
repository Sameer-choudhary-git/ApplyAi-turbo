ALTER TABLE "users"
ADD COLUMN "isGreenhouseApplyEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "user_preferences"
ADD COLUMN "platformDailyLimits" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "greenhousePreferences" JSONB;

ALTER TABLE "user_job_applications"
ADD COLUMN "externalJobKey" TEXT;

CREATE UNIQUE INDEX "user_job_applications_userId_externalJobKey_key"
ON "user_job_applications"("userId", "externalJobKey");

CREATE TABLE "greenhouse_boards" (
  "id" TEXT NOT NULL,
  "boardToken" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "boardUrl" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'hybrid',
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastCheckedAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastStatus" INTEGER,
  "lastError" TEXT,
  "activeJobCount" INTEGER NOT NULL DEFAULT 0,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "greenhouse_boards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "greenhouse_boards_boardToken_key"
ON "greenhouse_boards"("boardToken");
CREATE INDEX "greenhouse_boards_status_idx" ON "greenhouse_boards"("status");
CREATE INDEX "greenhouse_boards_company_idx" ON "greenhouse_boards"("company");

CREATE TABLE "greenhouse_jobs" (
  "id" TEXT NOT NULL,
  "externalKey" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "boardToken" TEXT NOT NULL,
  "greenhouseJobId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "jobLink" TEXT NOT NULL,
  "location" TEXT,
  "departments" JSONB,
  "offices" JSONB,
  "firstPublished" TIMESTAMP(3),
  "sourceUpdatedAt" TIMESTAMP(3),
  "applicationDeadline" TIMESTAMP(3),
  "descriptionHtml" TEXT,
  "descriptionText" TEXT,
  "metadata" JSONB,
  "raw" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDiscoveryRunId" TEXT,
  CONSTRAINT "greenhouse_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "greenhouse_jobs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "greenhouse_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "greenhouse_jobs_externalKey_key" ON "greenhouse_jobs"("externalKey");
CREATE INDEX "greenhouse_jobs_isActive_idx" ON "greenhouse_jobs"("isActive");
CREATE INDEX "greenhouse_jobs_boardId_idx" ON "greenhouse_jobs"("boardId");
CREATE INDEX "greenhouse_jobs_company_idx" ON "greenhouse_jobs"("company");
CREATE INDEX "greenhouse_jobs_lastSeenAt_idx" ON "greenhouse_jobs"("lastSeenAt");

CREATE TABLE "greenhouse_discovery_runs" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "candidateBoards" INTEGER NOT NULL DEFAULT 0,
  "validBoards" INTEGER NOT NULL DEFAULT 0,
  "failedBoards" INTEGER NOT NULL DEFAULT 0,
  "jobsSeen" INTEGER NOT NULL DEFAULT 0,
  "newJobs" INTEGER NOT NULL DEFAULT 0,
  "updatedJobs" INTEGER NOT NULL DEFAULT 0,
  "sources" JSONB,
  "error" TEXT,
  CONSTRAINT "greenhouse_discovery_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "greenhouse_discovery_runs_startedAt_idx" ON "greenhouse_discovery_runs"("startedAt");
CREATE INDEX "greenhouse_discovery_runs_status_idx" ON "greenhouse_discovery_runs"("status");
