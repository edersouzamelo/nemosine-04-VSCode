-- Rollback for 20260628_add_multi_persona_collective_sessions.sql.
-- This removes only the additive collective-session structures.
-- Review before running in production: dropping these tables removes collective
-- presence history, per-persona collective episodes, and metadata-only audits.

DROP TABLE IF EXISTS "CollectiveGenerationAudit";
DROP TABLE IF EXISTS "PersonaConversationEpisode";
DROP TABLE IF EXISTS "ThreadPersonaPresence";

DROP INDEX IF EXISTS "Message_threadId_turnGroupId_idx";
DROP INDEX IF EXISTS "Message_threadId_speakerPersonaId_idx";
DROP INDEX IF EXISTS "Message_messageKind_idx";
DROP INDEX IF EXISTS "Message_generationStatus_idx";
DROP INDEX IF EXISTS "Thread_userId_personaId_idx";
DROP INDEX IF EXISTS "Thread_userId_placeId_idx";
DROP INDEX IF EXISTS "Thread_userId_mode_idx";

ALTER TABLE "Message"
  DROP COLUMN IF EXISTS "speakerPersonaId",
  DROP COLUMN IF EXISTS "turnGroupId",
  DROP COLUMN IF EXISTS "messageKind",
  DROP COLUMN IF EXISTS "generationStatus";

ALTER TABLE "Thread"
  DROP COLUMN IF EXISTS "mode",
  DROP COLUMN IF EXISTS "placeId";

DROP TYPE IF EXISTS "PersonaEpisodeVisibilityPolicy";
DROP TYPE IF EXISTS "GenerationStatus";
DROP TYPE IF EXISTS "MessageKind";
DROP TYPE IF EXISTS "ThreadPersonaRole";
DROP TYPE IF EXISTS "ThreadMode";
