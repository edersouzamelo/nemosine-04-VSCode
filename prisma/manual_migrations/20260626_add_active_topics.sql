CREATE TABLE IF NOT EXISTS "ActiveTopic" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "keywords" JSONB,
  "salience" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "privacyScope" TEXT NOT NULL DEFAULT 'PUBLIC',
  "sourceThreadId" TEXT,
  "sourcePersonaId" TEXT,
  "firstObservedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastObservedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolvedAt" TIMESTAMPTZ,
  "evidenceCount" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  CONSTRAINT "ActiveTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActiveTopic_userId_status_lastObservedAt_idx"
  ON "ActiveTopic" ("userId", "status", "lastObservedAt");

CREATE INDEX IF NOT EXISTS "ActiveTopic_userId_privacyScope_lastObservedAt_idx"
  ON "ActiveTopic" ("userId", "privacyScope", "lastObservedAt");

