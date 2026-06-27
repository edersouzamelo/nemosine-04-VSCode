CREATE TABLE IF NOT EXISTS cognitive_run_audits (
  id TEXT PRIMARY KEY,
  user_id_hash TEXT NOT NULL,
  thread_id_hash TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  place_id TEXT,
  runtime_mode TEXT NOT NULL,
  execution_profile TEXT NOT NULL,
  state_transitions JSONB NOT NULL,
  audit_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_status TEXT NOT NULL DEFAULT 'not_attempted',
  side_effect_status TEXT NOT NULL DEFAULT 'none',
  memory_effect_count INTEGER NOT NULL DEFAULT 0,
  registry_effect_count INTEGER NOT NULL DEFAULT 0,
  destiny_effect_count INTEGER NOT NULL DEFAULT 0,
  assistant_message_persisted BOOLEAN NOT NULL DEFAULT FALSE,
  audit_persisted BOOLEAN NOT NULL DEFAULT FALSE,
  iteration_count INTEGER NOT NULL,
  coherence DOUBLE PRECISION,
  dimension_scores JSONB NOT NULL,
  finding_codes JSONB NOT NULL,
  promotion_decision TEXT NOT NULL,
  failure_reason TEXT,
  latency_per_stage_ms JSONB NOT NULL,
  model_identifiers JSONB NOT NULL,
  prompt_hashes JSONB NOT NULL,
  content_hashes JSONB NOT NULL,
  content_lengths JSONB NOT NULL DEFAULT '{}'::jsonb,
  private_run BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_only BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL,
  final_status TEXT NOT NULL DEFAULT 'UNKNOWN'
);

CREATE INDEX IF NOT EXISTS cognitive_run_audits_persona_id_idx
  ON cognitive_run_audits (persona_id);

CREATE INDEX IF NOT EXISTS cognitive_run_audits_runtime_mode_idx
  ON cognitive_run_audits (runtime_mode);

CREATE INDEX IF NOT EXISTS cognitive_run_audits_created_at_idx
  ON cognitive_run_audits (created_at);

ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_attempted';
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS side_effect_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS memory_effect_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS registry_effect_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS destiny_effect_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS assistant_message_persisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS audit_persisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cognitive_run_audits ADD COLUMN IF NOT EXISTS final_status TEXT NOT NULL DEFAULT 'UNKNOWN';
