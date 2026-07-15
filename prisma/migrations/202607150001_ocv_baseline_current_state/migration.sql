-- OCV baseline marker for the existing Supabase schema as audited on 2026-07-15.
-- This migration intentionally performs no schema change.
--
-- The database already contained the application core tables, cognitive_run_audits,
-- ActiveTopic, multi-persona tables, and the sovereign_destiny_events base table
-- through previously approved manual SQL and runtime-safe CREATE IF NOT EXISTS
-- paths. We start Prisma migration history here without inventing retroactive
-- migrations for that past state.

SELECT 1;
