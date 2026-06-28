-- Multi-persona collective sessions, additive rollout.
-- Safe to run repeatedly on PostgreSQL.

DO $$ BEGIN
  CREATE TYPE "ThreadMode" AS ENUM ('SINGLE', 'COLLECTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ThreadPersonaRole" AS ENUM ('HOST', 'GUEST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageKind" AS ENUM ('USER', 'PERSONA', 'SYSTEM_EVENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaEpisodeVisibilityPolicy" AS ENUM ('SHARED', 'PERSONA_PRIVATE', 'CONFESSOR_SEALED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Thread"
  ADD COLUMN IF NOT EXISTS "mode" "ThreadMode" NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS "placeId" TEXT;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "speakerPersonaId" TEXT,
  ADD COLUMN IF NOT EXISTS "turnGroupId" TEXT,
  ADD COLUMN IF NOT EXISTS "messageKind" "MessageKind",
  ADD COLUMN IF NOT EXISTS "generationStatus" "GenerationStatus";

CREATE TABLE IF NOT EXISTS "ThreadPersonaPresence" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "role" "ThreadPersonaRole" NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreadPersonaPresence_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PersonaConversationEpisode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "turnGroupId" TEXT,
  "content" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "visibilityPolicy" "PersonaEpisodeVisibilityPolicy" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonaConversationEpisode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PersonaConversationEpisode_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectiveGenerationAudit" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "turnGroupId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "participantRole" "ThreadPersonaRole" NOT NULL,
  "generationStatus" "GenerationStatus" NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "model" TEXT NOT NULL,
  "tokens" JSONB,
  "memoryWrites" INTEGER NOT NULL DEFAULT 0,
  "filteredHistoryCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectiveGenerationAudit_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Thread_userId_personaId_idx" ON "Thread"("userId", "personaId");
CREATE INDEX IF NOT EXISTS "Thread_userId_placeId_idx" ON "Thread"("userId", "placeId");
CREATE INDEX IF NOT EXISTS "Thread_userId_mode_idx" ON "Thread"("userId", "mode");

CREATE INDEX IF NOT EXISTS "Message_threadId_turnGroupId_idx" ON "Message"("threadId", "turnGroupId");
CREATE INDEX IF NOT EXISTS "Message_threadId_speakerPersonaId_idx" ON "Message"("threadId", "speakerPersonaId");
CREATE INDEX IF NOT EXISTS "Message_messageKind_idx" ON "Message"("messageKind");
CREATE INDEX IF NOT EXISTS "Message_generationStatus_idx" ON "Message"("generationStatus");

CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_threadId_idx" ON "ThreadPersonaPresence"("threadId");
CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_personaId_idx" ON "ThreadPersonaPresence"("personaId");
CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_active_idx" ON "ThreadPersonaPresence"("active");
CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_threadId_active_idx" ON "ThreadPersonaPresence"("threadId", "active");
CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_threadId_personaId_active_idx" ON "ThreadPersonaPresence"("threadId", "personaId", "active");

CREATE UNIQUE INDEX IF NOT EXISTS "PersonaConversationEpisode_threadId_personaId_sourceHash_key"
  ON "PersonaConversationEpisode"("threadId", "personaId", "sourceHash");
CREATE INDEX IF NOT EXISTS "PersonaConversationEpisode_userId_personaId_createdAt_idx"
  ON "PersonaConversationEpisode"("userId", "personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "PersonaConversationEpisode_threadId_turnGroupId_idx"
  ON "PersonaConversationEpisode"("threadId", "turnGroupId");
CREATE INDEX IF NOT EXISTS "PersonaConversationEpisode_visibilityPolicy_idx"
  ON "PersonaConversationEpisode"("visibilityPolicy");

CREATE INDEX IF NOT EXISTS "CollectiveGenerationAudit_threadId_turnGroupId_idx"
  ON "CollectiveGenerationAudit"("threadId", "turnGroupId");
CREATE INDEX IF NOT EXISTS "CollectiveGenerationAudit_personaId_idx"
  ON "CollectiveGenerationAudit"("personaId");
CREATE INDEX IF NOT EXISTS "CollectiveGenerationAudit_generationStatus_idx"
  ON "CollectiveGenerationAudit"("generationStatus");
CREATE INDEX IF NOT EXISTS "CollectiveGenerationAudit_createdAt_idx"
  ON "CollectiveGenerationAudit"("createdAt");
