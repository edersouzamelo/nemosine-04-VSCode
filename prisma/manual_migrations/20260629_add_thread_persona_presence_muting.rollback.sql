-- Rollback for participant muting.

DROP INDEX IF EXISTS "ThreadPersonaPresence_threadId_active_muted_idx";

ALTER TABLE "ThreadPersonaPresence"
  DROP COLUMN IF EXISTS "muted";
