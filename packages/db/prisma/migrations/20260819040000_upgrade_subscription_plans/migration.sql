ALTER TABLE "subscription_tiers"
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "subscription_access_codes"
  ADD COLUMN "featureOverrides" JSONB,
  ADD COLUMN "limitOverrides" JSONB;

ALTER TABLE "user_entitlements"
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'code',
  ADD COLUMN "note" TEXT,
  ADD COLUMN "featureOverrides" JSONB,
  ADD COLUMN "limitOverrides" JSONB,
  ADD COLUMN "grantedByUserId" TEXT;

CREATE INDEX "user_entitlements_tierId_status_idx"
  ON "user_entitlements"("tierId", "status");

CREATE TABLE "subscription_usage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entitlementId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_usage_entitlementId_metric_periodKey_key"
  ON "subscription_usage"("entitlementId", "metric", "periodKey");
CREATE INDEX "subscription_usage_userId_metric_periodEnd_idx"
  ON "subscription_usage"("userId", "metric", "periodEnd");

CREATE TABLE "subscription_audit_events" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "userId" TEXT,
  "entitlementId" TEXT,
  "codeId" TEXT,
  "action" TEXT NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_audit_events_userId_createdAt_idx"
  ON "subscription_audit_events"("userId", "createdAt");
CREATE INDEX "subscription_audit_events_actorUserId_createdAt_idx"
  ON "subscription_audit_events"("actorUserId", "createdAt");
CREATE INDEX "subscription_audit_events_codeId_createdAt_idx"
  ON "subscription_audit_events"("codeId", "createdAt");

ALTER TABLE "user_entitlements"
  ADD CONSTRAINT "user_entitlements_grantedByUserId_fkey"
  FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_usage"
  ADD CONSTRAINT "subscription_usage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_usage"
  ADD CONSTRAINT "subscription_usage_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "user_entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events"
  ADD CONSTRAINT "subscription_audit_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events"
  ADD CONSTRAINT "subscription_audit_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events"
  ADD CONSTRAINT "subscription_audit_events_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "user_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_audit_events"
  ADD CONSTRAINT "subscription_audit_events_codeId_fkey"
  FOREIGN KEY ("codeId") REFERENCES "subscription_access_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "subscription_redemptions"
SET "tierKey" = 'pro'
WHERE "tierKey" = 'job_skill';

UPDATE "subscription_tiers"
SET
  "key" = 'pro',
  "name" = 'Pro',
  "description" = 'Advanced discovery, automation, tailored materials, and higher usage limits.',
  "features" = '{"saved_jobs":true,"application_tracking":true,"networking":true,"job_skill_search":true,"job_skill_schedule":true,"job_skill_materials":true,"resume_generation":true,"cover_letter_generation":true,"analytics":true}',
  "limits" = '{"manual_runs_per_month":30,"scheduled_runs_per_day":1,"results_per_run":100,"materials_per_run":10,"saved_jobs":250,"networking_contacts":500,"applications_per_month":100,"resume_generations_per_month":30,"cover_letter_generations_per_month":30}',
  "displayOrder" = 2,
  "isPublic" = true
WHERE "key" = 'job_skill';

UPDATE "subscription_tiers"
SET "displayOrder" = 1, "isPublic" = true,
    "features" = '{"frontend_access":true}',
    "limits" = '{"manual_runs_per_month":0,"scheduled_runs_per_day":0,"results_per_run":0,"materials_per_run":0,"saved_jobs":0,"networking_contacts":0,"applications_per_month":0,"resume_generations_per_month":0,"cover_letter_generations_per_month":0}'
WHERE "key" = 'free';

INSERT INTO "subscription_tiers" ("id", "key", "name", "description", "features", "limits", "displayOrder", "isPublic", "isActive", "createdAt", "updatedAt")
VALUES (
  'tier_max', 'max', 'Max', 'Unlimited access to all available ApplyAI services and automation.',
  '{"saved_jobs":true,"application_tracking":true,"networking":true,"job_skill_search":true,"job_skill_schedule":true,"job_skill_materials":true,"resume_generation":true,"cover_letter_generation":true,"analytics":true,"priority_processing":true}',
  '{"manual_runs_per_month":-1,"scheduled_runs_per_day":-1,"results_per_run":-1,"materials_per_run":-1,"saved_jobs":-1,"networking_contacts":-1,"applications_per_month":-1,"resume_generations_per_month":-1,"cover_letter_generations_per_month":-1}',
  3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "features" = EXCLUDED."features",
  "limits" = EXCLUDED."limits",
  "displayOrder" = EXCLUDED."displayOrder",
  "isPublic" = EXCLUDED."isPublic",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
