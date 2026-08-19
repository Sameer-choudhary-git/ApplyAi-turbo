CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL DEFAULT '{}',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_tiers_key_key" ON "subscription_tiers"("key");

CREATE TABLE "subscription_access_codes" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codePrefix" TEXT NOT NULL,
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_access_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_access_codes_codeHash_key" ON "subscription_access_codes"("codeHash");
CREATE INDEX "subscription_access_codes_tierId_idx" ON "subscription_access_codes"("tierId");
CREATE INDEX "subscription_access_codes_expiresAt_idx" ON "subscription_access_codes"("expiresAt");
CREATE INDEX "subscription_access_codes_revokedAt_idx" ON "subscription_access_codes"("revokedAt");

CREATE TABLE "subscription_redemptions" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierKey" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_redemptions_codeId_userId_key" ON "subscription_redemptions"("codeId", "userId");
CREATE INDEX "subscription_redemptions_userId_redeemedAt_idx" ON "subscription_redemptions"("userId", "redeemedAt");

CREATE TABLE "user_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "sourceRedemptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "featuresSnapshot" JSONB NOT NULL DEFAULT '{}',
    "limitsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_entitlements_sourceRedemptionId_key" ON "user_entitlements"("sourceRedemptionId");
CREATE INDEX "user_entitlements_userId_status_idx" ON "user_entitlements"("userId", "status");
CREATE INDEX "user_entitlements_userId_endsAt_idx" ON "user_entitlements"("userId", "endsAt");

ALTER TABLE "subscription_access_codes"
ADD CONSTRAINT "subscription_access_codes_tierId_fkey"
FOREIGN KEY ("tierId") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_access_codes"
ADD CONSTRAINT "subscription_access_codes_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_redemptions"
ADD CONSTRAINT "subscription_redemptions_codeId_fkey"
FOREIGN KEY ("codeId") REFERENCES "subscription_access_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_redemptions"
ADD CONSTRAINT "subscription_redemptions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_entitlements"
ADD CONSTRAINT "user_entitlements_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_entitlements"
ADD CONSTRAINT "user_entitlements_tierId_fkey"
FOREIGN KEY ("tierId") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_entitlements"
ADD CONSTRAINT "user_entitlements_sourceRedemptionId_fkey"
FOREIGN KEY ("sourceRedemptionId") REFERENCES "subscription_redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "subscription_tiers" ("id", "key", "name", "description", "features", "limits", "updatedAt")
VALUES
  ('tier_free', 'free', 'Free', 'Core profile and application tracking features.', '{"saved_jobs":true,"application_tracking":true}', '{"manual_runs_per_day":1,"materials_per_run":0}', CURRENT_TIMESTAMP),
  ('tier_job_skill', 'job_skill', 'Job Skill', 'Job discovery, fit scoring, scheduled runs, and tailored materials.', '{"saved_jobs":true,"application_tracking":true,"job_skill_search":true,"job_skill_schedule":true,"job_skill_materials":true}', '{"manual_runs_per_day":3,"scheduled_runs_per_day":1,"results_per_run":50,"materials_per_run":10}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
