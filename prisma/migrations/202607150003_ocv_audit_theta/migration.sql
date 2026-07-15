-- Persist the Vigia threshold used by each OCV run.
-- Safe policy: additive DDL only.

ALTER TABLE cognitive_run_audits
  ADD COLUMN IF NOT EXISTS theta DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS cognitive_run_audits_theta_idx
  ON cognitive_run_audits (theta);
