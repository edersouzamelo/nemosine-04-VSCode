-- OCV additive foundation migration.
-- Safe policy: additive DDL only; no DROP, RESET, TRUNCATE, destructive ALTER,
-- data deletion, or RLS policy changes.

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

ALTER TABLE "ThreadPersonaPresence"
  ADD COLUMN IF NOT EXISTS "muted" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_threadId_active_muted_idx"
  ON "ThreadPersonaPresence"("threadId", "active", "muted");

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS external_visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS cognitive_visibility TEXT NOT NULL DEFAULT 'all-public-personas';

ALTER TABLE sovereign_destiny_events
  ADD COLUMN IF NOT EXISTS cognitive_personas TEXT NOT NULL DEFAULT '[]';

UPDATE sovereign_destiny_events
SET external_visibility = 'legacy'
WHERE visibility = 'legacy'
  AND external_visibility = 'private';

UPDATE sovereign_destiny_events
SET cognitive_visibility = 'excluded-from-personas'
WHERE visibility = 'sensitive'
  AND cognitive_visibility = 'all-public-personas';

CREATE INDEX IF NOT EXISTS sovereign_destiny_events_cognitive_visibility_idx
  ON sovereign_destiny_events(cognitive_visibility);

CREATE TABLE IF NOT EXISTS sovereign_destiny_context_index (
  destiny_event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  searchable_text TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',
  persona_affinities TEXT NOT NULL DEFAULT '[]',
  temporal_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  biographical_importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sovereign_destiny_context_index_user_id_idx
  ON sovereign_destiny_context_index(user_id);

INSERT INTO sovereign_destiny_context_index (
  destiny_event_id,
  user_id,
  searchable_text,
  categories,
  persona_affinities,
  temporal_importance,
  biographical_importance,
  updated_at
)
SELECT
  id,
  user_id,
  CONCAT_WS(' | ',
    title,
    category,
    short_description,
    long_description,
    dominant_emotion,
    associated_persona,
    associated_place,
    life_phase,
    tags
  ),
  CASE
    WHEN life_phase IS NULL OR life_phase = '' THEN jsonb_build_array(category)::text
    ELSE jsonb_build_array(category, life_phase)::text
  END,
  CASE
    WHEN associated_persona IS NULL OR associated_persona = '' THEN '[]'
    ELSE jsonb_build_array(associated_persona)::text
  END,
  LEAST(1.0, GREATEST(0.2,
    0.35
    + CASE WHEN event_date IS NOT NULL OR event_date_label IS NOT NULL THEN 0.2 ELSE 0 END
    + CASE WHEN life_phase IS NOT NULL AND life_phase <> '' THEN 0.15 ELSE 0 END
    + COALESCE(symbolic_intensity, 2) / 25.0
  )),
  LEAST(1.0, GREATEST(0.2,
    0.35
    + CASE WHEN category IN ('Familia', 'Saude', 'Carreira', 'Obra', 'Criacao', 'Perda', 'Virada', 'Travessia', 'Relacoes') THEN 0.25 ELSE 0 END
    + COALESCE(symbolic_intensity, 2) / 20.0
    + CASE WHEN long_description IS NOT NULL AND LENGTH(long_description) > 80 THEN 0.1 ELSE 0 END
  )),
  NOW()
FROM sovereign_destiny_events
ON CONFLICT (destiny_event_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  searchable_text = EXCLUDED.searchable_text,
  categories = EXCLUDED.categories,
  persona_affinities = EXCLUDED.persona_affinities,
  temporal_importance = EXCLUDED.temporal_importance,
  biographical_importance = EXCLUDED.biographical_importance,
  updated_at = NOW();
