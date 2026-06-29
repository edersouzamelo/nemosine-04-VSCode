-- Add per-participant muting for collective persona sessions.
-- Safe to run repeatedly on PostgreSQL.

ALTER TABLE "ThreadPersonaPresence"
  ADD COLUMN IF NOT EXISTS "muted" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "ThreadPersonaPresence_threadId_active_muted_idx"
  ON "ThreadPersonaPresence"("threadId", "active", "muted");
