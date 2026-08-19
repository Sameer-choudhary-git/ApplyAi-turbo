CREATE TABLE "job_skill_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "idempotencyKey" TEXT NOT NULL,
    "configurationHash" TEXT NOT NULL,
    "profileSnapshot" JSONB NOT NULL DEFAULT '{}',
    "preferencesSnapshot" JSONB NOT NULL DEFAULT '{}',
    "entitlementSnapshot" JSONB NOT NULL DEFAULT '{}',
    "providerCount" INTEGER NOT NULL DEFAULT 0,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_skill_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_skill_runs_userId_idempotencyKey_key" ON "job_skill_runs"("userId", "idempotencyKey");
CREATE INDEX "job_skill_runs_userId_createdAt_idx" ON "job_skill_runs"("userId", "createdAt");
CREATE INDEX "job_skill_runs_userId_status_idx" ON "job_skill_runs"("userId", "status");

CREATE TABLE "job_skill_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cronExpression" TEXT NOT NULL DEFAULT '30 18 * * *',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "providerKeys" JSONB NOT NULL DEFAULT '[]',
    "roles" JSONB NOT NULL DEFAULT '[]',
    "locations" JSONB NOT NULL DEFAULT '[]',
    "companyTypes" JSONB NOT NULL DEFAULT '[]',
    "seniority" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "maxResults" INTEGER NOT NULL DEFAULT 50,
    "materialLimit" INTEGER NOT NULL DEFAULT 10,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_skill_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_skill_schedules_userId_key" ON "job_skill_schedules"("userId");
CREATE INDEX "job_skill_schedules_enabled_nextRunAt_idx" ON "job_skill_schedules"("enabled", "nextRunAt");

CREATE TABLE "job_skill_opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "jobType" TEXT,
    "salary" TEXT,
    "description" TEXT,
    "postedAt" TIMESTAMP(3),
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "fitnessScore" INTEGER,
    "scoreReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'found',
    "savedJobId" TEXT,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_skill_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_skill_opportunities_userId_canonicalUrl_key" ON "job_skill_opportunities"("userId", "canonicalUrl");
CREATE INDEX "job_skill_opportunities_userId_fitnessScore_idx" ON "job_skill_opportunities"("userId", "fitnessScore");
CREATE INDEX "job_skill_opportunities_userId_status_idx" ON "job_skill_opportunities"("userId", "status");
CREATE INDEX "job_skill_opportunities_provider_externalId_idx" ON "job_skill_opportunities"("provider", "externalId");

CREATE TABLE "job_skill_artifacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageKey" TEXT,
    "publicUrl" TEXT,
    "checksum" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_skill_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_skill_artifacts_userId_runId_idx" ON "job_skill_artifacts"("userId", "runId");
CREATE INDEX "job_skill_artifacts_opportunityId_kind_idx" ON "job_skill_artifacts"("opportunityId", "kind");

ALTER TABLE "job_skill_runs"
ADD CONSTRAINT "job_skill_runs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skill_schedules"
ADD CONSTRAINT "job_skill_schedules_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skill_opportunities"
ADD CONSTRAINT "job_skill_opportunities_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skill_opportunities"
ADD CONSTRAINT "job_skill_opportunities_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "job_skill_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_skill_artifacts"
ADD CONSTRAINT "job_skill_artifacts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skill_artifacts"
ADD CONSTRAINT "job_skill_artifacts_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "job_skill_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skill_artifacts"
ADD CONSTRAINT "job_skill_artifacts_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "job_skill_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
