-- Additive local migration for the User Graph and cognitive foundation audit layer.
-- Do not run against production without an explicit release plan and backup.

DO $$
BEGIN
  CREATE TYPE "UserProfileEpistemicType" AS ENUM (
    'DECLARED_FACT',
    'OBSERVED_BEHAVIOR',
    'INFERRED_PATTERN',
    'USER_PREFERENCE',
    'GOAL',
    'VALUE',
    'RELATIONSHIP',
    'PROJECT',
    'CONSTRAINT',
    'HYPOTHESIS',
    'PUBLIC_SOURCE_CANDIDATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserProfileStatus" AS ENUM (
    'CANDIDATE',
    'CONFIRMED',
    'REJECTED',
    'SUPERSEDED',
    'EXPIRED',
    'DELETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserProfileSensitivity" AS ENUM (
    'PUBLIC',
    'NORMAL',
    'PERSONAL',
    'SENSITIVE',
    'CONFESSOR_ONLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserProfileScopeType" AS ENUM (
    'GLOBAL',
    'AUTHORIZED_PERSONAS',
    'PERSONA_SPECIFIC',
    'CONFESSOR',
    'SYSTEM',
    'NON_PROJECTABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserProfileNode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "normalizedContent" TEXT NOT NULL,
  "shortSummary" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subtype" TEXT,
  "epistemicType" "UserProfileEpistemicType" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceReference" TEXT,
  "sourceDate" TIMESTAMPTZ,
  "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "sensitivity" "UserProfileSensitivity" NOT NULL DEFAULT 'NORMAL',
  "scopeType" "UserProfileScopeType" NOT NULL DEFAULT 'GLOBAL',
  "authorizedPersonas" JSONB,
  "status" "UserProfileStatus" NOT NULL DEFAULT 'CANDIDATE',
  "validFrom" TIMESTAMPTZ,
  "validUntil" TIMESTAMPTZ,
  "createdBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "removedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "UserProfileNode_userId_status_updatedAt_idx"
  ON "UserProfileNode" ("userId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "UserProfileNode_userId_category_status_idx"
  ON "UserProfileNode" ("userId", "category", "status");
CREATE INDEX IF NOT EXISTS "UserProfileNode_userId_epistemicType_status_idx"
  ON "UserProfileNode" ("userId", "epistemicType", "status");
CREATE INDEX IF NOT EXISTS "UserProfileNode_userId_sensitivity_status_idx"
  ON "UserProfileNode" ("userId", "sensitivity", "status");
CREATE INDEX IF NOT EXISTS "UserProfileNode_scopeType_idx"
  ON "UserProfileNode" ("scopeType");

CREATE TABLE IF NOT EXISTS "UserProfileEvidence" (
  "id" TEXT PRIMARY KEY,
  "profileNodeId" TEXT NOT NULL REFERENCES "UserProfileNode"("id") ON DELETE CASCADE,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "redactedSummary" TEXT,
  "contentHash" TEXT,
  "evidenceWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "evidenceDate" TIMESTAMPTZ,
  "origin" TEXT,
  "allowedAccess" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UserProfileEvidence_profileNodeId_idx"
  ON "UserProfileEvidence" ("profileNodeId");
CREATE INDEX IF NOT EXISTS "UserProfileEvidence_sourceType_sourceId_idx"
  ON "UserProfileEvidence" ("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "UserProfileEvidence_contentHash_idx"
  ON "UserProfileEvidence" ("contentHash");

CREATE TABLE IF NOT EXISTS "CognitiveFoundationAudit" (
  "id" TEXT PRIMARY KEY,
  "userIdHash" TEXT NOT NULL,
  "threadIdHash" TEXT,
  "personaId" TEXT,
  "feature" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "metrics" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "findingCodes" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "contentHashes" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "contentLengths" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "privateRun" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadataOnly" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "CognitiveFoundationAudit_feature_eventType_createdAt_idx"
  ON "CognitiveFoundationAudit" ("feature", "eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "CognitiveFoundationAudit_mode_createdAt_idx"
  ON "CognitiveFoundationAudit" ("mode", "createdAt");
CREATE INDEX IF NOT EXISTS "CognitiveFoundationAudit_personaId_createdAt_idx"
  ON "CognitiveFoundationAudit" ("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "CognitiveFoundationAudit_privateRun_createdAt_idx"
  ON "CognitiveFoundationAudit" ("privateRun", "createdAt");
